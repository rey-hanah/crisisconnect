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
  async search(@Body('query') query: string): Promise<any> {
    return this.aiService.parseSearchQuery(query);
  }

  @Post('briefing')
  async briefing(@Body() body: { postIds?: string[] }): Promise<string> {
    return this.aiService.generateBriefing([]);
  }
}
