import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

interface VoicePostResult {
  title: string;
  description: string;
  category: string;
  peopleAffected: number;
  urgency: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  private getModel() {
    return this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async scorePost(postId: string): Promise<void> {
    try {
      const post = await this.postModel.findById(postId);
      if (!post) {
        this.logger.warn(`Post not found for scoring: ${postId}`);
        return;
      }

      const prompt = this.buildScoringPrompt(post);
      const result = await this.getModel().generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON in Gemini response');
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const resultData: ScoringResult = {
        score: parsed.score ?? 50,
        summary: parsed.summary ?? '',
        urgency: parsed.urgency ?? 'medium',
      };

      await this.postModel.findByIdAndUpdate(postId, {
        aiScore: resultData.score,
        aiSummary: resultData.summary,
        urgency: resultData.urgency,
      });

      this.logger.log(`Post ${postId} scored: ${resultData.score}/100`);
    } catch (error) {
      this.logger.error(`Failed to score post ${postId}:`, error);
    }
  }

  async getPostsByIds(postIds: string[]): Promise<PostDocument[]> {
    if (postIds.length === 0) {
      return [];
    }
    return this.postModel.find({ _id: { $in: postIds } });
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
      const result = await this.getModel().generateContent(prompt);
      const response = result.response;

      return response.text() || 'Briefing temporarily unavailable.';
    } catch (error) {
      this.logger.error('Failed to generate briefing:', error);
      return 'Briefing temporarily unavailable.';
    }
  }

  async parseSearchQuery(query: string): Promise<SearchFilters> {
    try {
      const prompt = `Parse this natural language search query and convert to filters:
"${query}"

Return ONLY valid JSON with fields: { "category": string|null, "type": "need"|"offer"|null, "urgency": string|null, "keywords": string[] }`;

      const result = await this.getModel().generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { category: null, type: null, urgency: null, keywords: [query] };
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error('Failed to parse search query:', error);
    }

    return { category: null, type: null, urgency: null, keywords: [query] };
  }

  async transcribeAudio(audioText: string): Promise<VoicePostResult> {
    try {
      const prompt = `You are an AI assistant for a crisis response app called CrisisConnect. A user has spoken a voice message describing a crisis need or offer. Parse it and extract structured information.

IMPORTANT RULES:
- The "title" must be a SHORT label (3-6 words max), like a headline. Do NOT put the full description in the title.
- Put ALL details into the "description" field.
- If the person mentions specific quantities (e.g. "4 blankets", "family of 5"), extract the number of people affected.
- Choose the most fitting category from: water, food, medical, shelter, rescue, other.
- Assess urgency based on the tone and content: low, medium, high, or critical.

Voice message transcript:
"${audioText}"

Return ONLY valid JSON with fields:
{
  "title": "short 3-6 word headline",
  "description": "full detailed description of the need or offer",
  "category": "water|food|medical|shelter|rescue|other",
  "peopleAffected": number,
  "urgency": "low|medium|high|critical"
}`;

      const result = await this.getModel().generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse voice post');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error('Failed to parse voice post:', error);
      throw error;
    }
  }

  private buildScoringPrompt(post: PostDocument): string {
    return `Analyze this crisis post and assign an urgency score 0-100:
Type: ${post.type}
Category: ${post.category}
Title: ${post.title}
Description: ${post.description || 'None'}
People affected: ${post.peopleAffected}

Respond with ONLY valid JSON: { "score": number, "summary": string, "urgency": "low|medium|high|critical" }`;
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
