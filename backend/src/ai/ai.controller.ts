import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('voice-post')
  @UseGuards(JwtAuthGuard)
  async voicePost(@Body() body: { text: string }) {
    if (!body.text) {
      throw new Error('No text provided');
    }

    const parsed = await this.aiService.transcribeAudio(body.text);

    return {
      ...parsed,
    };
  }

  @Post('search')
  @UseGuards(JwtAuthGuard)
  async search(@Body('query') query: string): Promise<any> {
    return this.aiService.parseSearchQuery(query);
  }

  @Post('briefing')
  @UseGuards(JwtAuthGuard)
  async briefing(@Body() body: { postIds?: string[] }): Promise<string> {
    const postIds = body.postIds || [];
    const posts = await this.aiService.getPostsByIds(postIds);
    return this.aiService.generateBriefing(posts);
  }
}
