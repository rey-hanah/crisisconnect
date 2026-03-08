import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument, PostStatus, PostType } from './post.schema';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<PostDocument> {
    const post = new this.postModel({
      userId: new Types.ObjectId(userId),
      type: dto.type,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      location: { type: 'Point', coordinates: [dto.lng, dto.lat] },
      neighborhood: dto.neighborhood,
      peopleAffected: dto.peopleAffected || 1,
      urgency: dto.urgency || 'medium',
      photos: dto.photos || [],
      status: PostStatus.ACTIVE,
    });

    return post.save();
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 10): Promise<PostDocument[]> {
    return this.postModel.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
      status: { $ne: PostStatus.FULFILLED },
    }).limit(100);
  }

  async findById(id: string): Promise<PostDocument> {
    const post = await this.postModel.findById(id).populate('userId', 'displayName');
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async claim(postId: string, userId: string): Promise<PostDocument> {
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      { status: PostStatus.CLAIMED, claimedBy: new Types.ObjectId(userId) },
      { new: true },
    );
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async fulfill(postId: string): Promise<PostDocument> {
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      { status: PostStatus.FULFILLED, fulfilledAt: new Date() },
      { new: true },
    );
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async findMatches(postId: string): Promise<PostDocument | null> {
    const post = await this.findById(postId);
    if (!post || post.type === 'offer') return null;

    const [lng, lat] = post.location.coordinates;
    
    return this.postModel.findOne({
      _id: { $ne: post._id },
      type: PostType.OFFER,
      category: post.category,
      status: PostStatus.ACTIVE,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 5000,
        },
      },
    });
  }

  async findAll(): Promise<PostDocument[]> {
    return this.postModel.find({ status: { $ne: PostStatus.FULFILLED } }).limit(200);
  }

  async getPostOwner(postId: string): Promise<{ id: string; displayName: string } | null> {
    const post = await this.postModel.findById(postId).populate('userId', 'displayName');
    if (!post) return null;
    return {
      id: (post.userId as any)._id?.toString() || (post.userId as any).id,
      displayName: (post.userId as any).displayName,
    };
  }
}
