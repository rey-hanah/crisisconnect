import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PostsService } from './posts.service';
import { AiService } from '../ai/ai.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(
    private postsService: PostsService,
    private aiService: AiService,
  ) {}

  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Request() req: any) {
    return this.postsService.findByUser(req.user.id);
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    if (!lat || !lng) {
      return this.postsService.findAll();
    }
    return this.postsService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 10,
    );
  }

  @Get(':id/match')
  findMatch(@Param('id') id: string) {
    return this.postsService.findMatches(id);
  }

  @Get(':id/owner')
  getOwner(@Param('id') id: string) {
    return this.postsService.getPostOwner(id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() dto: CreatePostDto) {
    const post = await this.postsService.create(req.user.id, dto);
    // Fire-and-forget AI scoring
    this.aiService.scorePost((post as any)._id.toString()).catch(() => {});
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
        if (allowed.test(extname(file.originalname))) {
          cb(null, true);
        } else {
          cb(new Error('Only image and document files are allowed'), false);
        }
      },
    }),
  )
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map((f) => ({
      filename: f.filename,
      originalname: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size,
    }));
  }

  // Request to claim (volunteer to help)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/claim')
  claim(@Param('id') id: string, @Request() req: any) {
    return this.postsService.requestClaim(id, req.user.id);
  }

  // Approve a claim request (poster only)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve-claim')
  approveClaim(
    @Param('id') id: string,
    @Body('requesterId') requesterId: string,
    @Request() req: any,
  ) {
    return this.postsService.approveClaim(id, requesterId, req.user.id);
  }

  // Mark as fulfilled (poster only)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/fulfill')
  fulfill(@Param('id') id: string, @Request() req: any) {
    return this.postsService.fulfill(id, req.user.id);
  }
}
