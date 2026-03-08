import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import OpenAI from 'openai';
import { Post, PostDocument } from '../posts/post.schema';

interface ScoringResult {
  score: number;
  summary: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface SearchFilters {
  category: string | null;
  type: 'need' | 'offer' | null;
  urgency: string | null;
  keywords: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async scorePost(postId: string): Promise<void> {
    try {
      const post = await this.postModel.findById(postId);
      if (!post) {
        this.logger.warn(`Post not found for scoring: ${postId}`);
        return;
      }

      const prompt = this.buildScoringPrompt(post);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.warn('Empty response from OpenAI');
        return;
      }
      const result: ScoringResult = JSON.parse(content);

      await this.postModel.findByIdAndUpdate(postId, {
        aiScore: result.score,
        aiSummary: result.summary,
        urgency: result.urgency,
      });

      this.logger.log(`Post ${postId} scored: ${result.score}/100`);
    } catch (error) {
      this.logger.error(`Failed to score post ${postId}:`, error);
    }
  }

  async generateBriefing(posts: PostDocument[]): Promise<string> {
    if (posts.length === 0) {
      return 'No active posts in this area.';
    }

    try {
      const critical = posts.filter(
        (p) => (p.urgency ?? 'low') === 'critical' || (p.aiScore ?? 0) > 80,
      );
      const urgent = posts.filter(
        (p) => (p.urgency ?? 'low') === 'high' || (p.aiScore ?? 0) > 60,
      );

      const prompt = this.buildBriefingPrompt(critical, urgent);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.choices[0]?.message?.content;
      return content ?? 'Briefing temporarily unavailable.';
    } catch (error) {
      this.logger.error('Failed to generate briefing:', error);
      return 'Briefing temporarily unavailable.';
    }
  }

  async parseSearchQuery(query: string): Promise<SearchFilters> {
    try {
      const prompt = `Parse this natural language search query and convert to filters:
"${query}"

Return JSON with fields: { "category": string|null, "type": "need"|"offer"|null, "urgency": string|null, "keywords": string[] }`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { category: null, type: null, urgency: null, keywords: [query] };
      }
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to parse search query:', error);
    }

    return { category: null, type: null, urgency: null, keywords: [query] };
  }

  private buildScoringPrompt(post: PostDocument): string {
    return `Analyze this crisis post and assign an urgency score 0-100:
Type: ${post.type}
Category: ${post.category}
Title: ${post.title}
Description: ${post.description || 'None'}
People affected: ${post.peopleAffected}

Respond with JSON: { "score": number, "summary": string, "urgency": "low|medium|high|critical" }`;
  }

  private buildBriefingPrompt(
    critical: PostDocument[],
    urgent: PostDocument[],
  ): string {
    let prompt = `Generate a 150-word crisis briefing for this area. `;

    if (critical.length > 0) {
      prompt += `CRITICAL posts: ${critical
        .map((p) => `${p.title} (${p.category})`)
        .join(', ')}. `;
    }
    if (urgent.length > 0) {
      prompt += `Urgent posts: ${urgent
        .map((p) => `${p.title} (${p.category})`)
        .join(', ')}. `;
    }

    prompt += `Suggest the most urgent action.`;

    return prompt;
  }
}
