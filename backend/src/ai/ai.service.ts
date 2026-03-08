import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

interface VoicePostResult {
  title: string;
  description: string;
  category: string;
  type: 'need' | 'offer';
  peopleAffected: number;
  urgency: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly openai: OpenAI;

  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }

  // ── Core: try Gemini, fall back to OpenAI with the same prompt ─────────────
  private async generate(prompt: string): Promise<string> {
    // Try Gemini first
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      this.logger.log('[AI] Gemini responded');
      return text;
    } catch (geminiError: any) {
      const isQuota =
        geminiError?.message?.includes('429') ||
        geminiError?.message?.includes('quota') ||
        geminiError?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuota) {
        this.logger.warn('[AI] Gemini quota exceeded — falling back to OpenAI');
      } else {
        this.logger.warn(`[AI] Gemini failed (${geminiError?.message}) — falling back to OpenAI`);
      }
    }

    // Fall back to OpenAI with the exact same prompt
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const text = completion.choices[0]?.message?.content || '';
    this.logger.log('[AI] OpenAI responded');
    return text;
  }

  // ── Parse JSON from AI response ─────────────────────────────────────────────
  private parseJson(text: string): any {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in AI response');
    return JSON.parse(match[0]);
  }

  // ── Score a post ─────────────────────────────────────────────────────────────
  async scorePost(postId: string): Promise<void> {
    try {
      const post = await this.postModel.findById(postId);
      if (!post) {
        this.logger.warn(`Post not found for scoring: ${postId}`);
        return;
      }

      const prompt = this.buildScoringPrompt(post);
      const text = await this.generate(prompt);
      const parsed = this.parseJson(text);

      const result: ScoringResult = {
        score: parsed.score ?? 50,
        summary: parsed.summary ?? '',
        urgency: parsed.urgency ?? 'medium',
      };

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

  // ── Get posts by IDs ─────────────────────────────────────────────────────────
  async getPostsByIds(postIds: string[]): Promise<PostDocument[]> {
    if (postIds.length === 0) return [];
    return this.postModel.find({ _id: { $in: postIds } });
  }

  // ── Generate crisis briefing ─────────────────────────────────────────────────
  async generateBriefing(posts: PostDocument[]): Promise<string> {
    if (posts.length === 0) return 'No active posts in this area.';

    try {
      const critical = posts.filter(
        (p) => p.urgency === 'critical' || (p.aiScore ?? 0) > 80,
      );
      const urgent = posts.filter(
        (p) => p.urgency === 'high' || (p.aiScore ?? 0) > 60,
      );

      const prompt = this.buildBriefingPrompt(critical, urgent);
      return await this.generate(prompt);
    } catch (error) {
      this.logger.error('Failed to generate briefing:', error);
      return 'Briefing temporarily unavailable.';
    }
  }

  // ── Parse natural language search ────────────────────────────────────────────
  async parseSearchQuery(query: string): Promise<SearchFilters> {
    try {
      const prompt = `Parse this natural language search query and convert to filters:
"${query}"

Return ONLY valid JSON with fields: { "category": string|null, "type": "need"|"offer"|null, "urgency": string|null, "keywords": string[] }`;

      const text = await this.generate(prompt);
      return this.parseJson(text);
    } catch (error) {
      this.logger.error('Failed to parse search query:', error);
      return { category: null, type: null, urgency: null, keywords: [query] };
    }
  }

  // ── Parse voice transcript into structured post fields ───────────────────────
  async transcribeAudio(audioText: string): Promise<VoicePostResult> {
    const prompt = `You are an AI assistant for a crisis response app called CrisisConnect. A user has spoken a voice message describing a crisis need or offer. Parse it and extract structured information.

IMPORTANT RULES:
- The "title" must be a SHORT label (3-6 words max), like a headline. Do NOT put the full description in the title.
- Put ALL details into the "description" field.
- Determine whether this is a "need" (the person is asking for help) or an "offer" (the person is offering to help others). Look for clues like "I need", "we need", "looking for", "help us" (need) vs. "I can", "I have", "offering", "available", "willing to" (offer). Default to "need" if ambiguous.
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
  "type": "need|offer",
  "peopleAffected": number,
  "urgency": "low|medium|high|critical"
}`;

    const text = await this.generate(prompt);
    return this.parseJson(text);
  }

  // ── Prompt builders ──────────────────────────────────────────────────────────
  private buildScoringPrompt(post: PostDocument): string {
    return `Analyze this crisis post and assign an urgency score 0-100:
Type: ${post.type}
Category: ${post.category}
Title: ${post.title}
Description: ${post.description || 'None'}
People affected: ${post.peopleAffected}

Respond with ONLY valid JSON: { "score": number, "summary": string, "urgency": "low|medium|high|critical" }`;
  }

  private buildBriefingPrompt(critical: PostDocument[], urgent: PostDocument[]): string {
    let prompt = `Generate a 150-word crisis briefing for this area. `;
    if (critical.length > 0) {
      prompt += `CRITICAL posts: ${critical.map((p) => `${p.title} (${p.category})`).join(', ')}. `;
    }
    if (urgent.length > 0) {
      prompt += `Urgent posts: ${urgent.map((p) => `${p.title} (${p.category})`).join(', ')}. `;
    }
    prompt += `Suggest the most urgent action.`;
    return prompt;
  }
}
