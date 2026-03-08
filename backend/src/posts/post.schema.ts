import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

export enum PostType {
  NEED = 'need',
  OFFER = 'offer',
}

export enum PostCategory {
  WATER = 'water',
  FOOD = 'food',
  MEDICAL = 'medical',
  SHELTER = 'shelter',
  RESCUE = 'rescue',
  OTHER = 'other',
}

export enum PostStatus {
  ACTIVE = 'active',
  CLAIMED = 'claimed',
  FULFILLED = 'fulfilled',
}

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: PostType })
  type: PostType;

  @Prop({ required: true, enum: PostCategory })
  category: PostCategory;

  @Prop({ required: true, maxlength: 120 })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: { type: String, coordinates: [Number] }, index: '2dsphere' })
  location: { type: string; coordinates: [number, number] };

  @Prop()
  neighborhood: string;

  @Prop({ default: 0 })
  aiScore: number;

  @Prop()
  aiSummary: string;

  @Prop({ default: 'medium', enum: ['low', 'medium', 'high', 'critical'] })
  urgency: string;

  @Prop({ type: Number, default: 1 })
  peopleAffected: number;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ default: 'active', enum: PostStatus })
  status: PostStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  claimedBy?: Types.ObjectId;

  @Prop()
  fulfilledAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ location: '2dsphere' });
