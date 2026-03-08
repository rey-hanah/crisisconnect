import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
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

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @Get(':id/match')
  findMatch(@Param('id') id: string) {
    return this.postsService.findMatches(id);
  }

  @Get(':id/owner')
  getOwner(@Param('id') id: string) {
    return this.postsService.getPostOwner(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() dto: CreatePostDto) {
    const post = await this.postsService.create(req.user.id, dto);
    // Fire-and-forget AI scoring — don't await so the response is instant
    this.aiService.scorePost((post as any)._id.toString()).catch(() => {});
    return post;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/claim')
  claim(@Param('id') id: string, @Request() req: any) {
    return this.postsService.claim(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/fulfill')
  fulfill(@Param('id') id: string) {
    return this.postsService.fulfill(id);
  }
}
