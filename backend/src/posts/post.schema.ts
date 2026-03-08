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
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: PostType, required: true })
  type!: PostType;

  @Prop({ type: String, enum: PostCategory, required: true })
  category!: PostCategory;

  @Prop({ type: String, required: true, maxlength: 120 })
  title!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Object })
  location!: { type: string; coordinates: [number, number] };

  @Prop({ type: String })
  neighborhood?: string;

  @Prop({ type: Number, default: 0 })
  aiScore!: number;

  @Prop({ type: String })
  aiSummary?: string;

  @Prop({ type: String, default: 'medium' })
  urgency!: string;

  @Prop({ type: Number, default: 1 })
  peopleAffected!: number;

  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: String, default: 'active' })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  claimedBy?: Types.ObjectId;

  @Prop({ type: Date })
  fulfilledAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ location: '2dsphere' });
