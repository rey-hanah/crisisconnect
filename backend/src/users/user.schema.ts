import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, unique: true })
  email!: string;

  @Prop({ type: String, required: true })
  password!: string;

  @Prop({ type: String, required: true })
  displayName!: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: [String], default: [] })
  passkeyCredentials!: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
