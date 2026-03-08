import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async create(email: string, password: string, displayName: string): Promise<UserDocument> {
    const user = new this.userModel({ email, password, displayName });
    return user.save();
  }

  async addPasskey(id: string, credentialId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $push: { passkeyCredentials: credentialId },
    });
  }
}
