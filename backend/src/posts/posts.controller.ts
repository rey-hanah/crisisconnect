import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
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

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
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
