import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Anthropic } from '@anthropic-ai/sdk';
import { Post, PostDocument } from '../posts/post.schema';

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async scorePost(postId: string): Promise<void> {
    const post = await this.postModel.findById(postId);
    if (!post) return;

    const prompt = `Analyze this crisis post and assign an urgency score 0-100:
Type: ${post.type}
Category: ${post.category}
Title: ${post.title}
Description: ${post.description || 'None'}
People affected: ${post.peopleAffected}

Respond with JSON: { "score": number, "summary": string, "urgency": "low|medium|high|critical" }`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          await this.postModel.findByIdAndUpdate(postId, {
            aiScore: result.score,
            aiSummary: result.summary,
            urgency: result.urgency,
          });
        }
      }
    } catch (error) {
      console.error('AI scoring error:', error);
    }
  }

  async generateBriefing(posts: PostDocument[]): Promise<string> {
    if (posts.length === 0) {
      return 'No active posts in this area.';
    }

    const critical = posts.filter(p => p.urgency === 'critical' || p.aiScore > 80);
    const urgent = posts.filter(p => p.urgency === 'high' || p.aiScore > 60);

    let prompt = `Generate a 150-word crisis briefing for this area. `;
    
    if (critical.length > 0) {
      prompt += `CRITICAL posts: ${critical.map(p => `${p.title} (${p.category})`).join(', ')}. `;
    }
    if (urgent.length > 0) {
      prompt += `Urgent posts: ${urgent.map(p => `${p.title} (${p.category})`).join(', ')}. `;
    }
    
    prompt += `Suggest the most urgent action.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Briefing unavailable.';
    } catch (error) {
      console.error('Briefing error:', error);
      return 'Briefing temporarily unavailable.';
    }
  }

  async parseSearchQuery(query: string): Promise<any> {
    const prompt = `Parse this natural language search query and convert to filters:
"${query}"

Return JSON with fields: { "category": string|null, "type": "need"|"offer"|null, "urgency": string|null, "keywords": string[] }`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Search parse error:', error);
    }

    return { category: null, type: null, urgency: null, keywords: [query] };
  }
}
