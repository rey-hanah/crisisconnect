import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

export interface CreateUserOptions {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async create(opts: CreateUserOptions): Promise<UserDocument> {
    const userData: any = {
      email: opts.email,
      password: opts.password,
      displayName: opts.displayName,
    };

    if (opts.phone) userData.phone = opts.phone;
    if (opts.city) userData.city = opts.city;
    if (opts.country) userData.country = opts.country;

    if (opts.lat != null && opts.lng != null) {
      userData.location = {
        type: 'Point',
        coordinates: [opts.lng, opts.lat],
      };
    }

    const user = new this.userModel(userData);
    return user.save();
  }

  async addPasskey(id: string, credentialId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $push: { passkeyCredentials: credentialId },
    });
  }
}
