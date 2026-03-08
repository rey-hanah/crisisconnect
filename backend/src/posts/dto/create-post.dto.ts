import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PostType, PostCategory } from '../post.schema';

export class CreatePostDto {
  @IsEnum(PostType)
  type: PostType;

  @IsEnum(PostCategory)
  category: PostCategory;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  peopleAffected?: number;

  @IsOptional()
  @IsString()
  urgency?: string;

  @IsOptional()
  photos?: string[];
}
