import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

export interface TokenUser {
  id: string;
  email: string;
  displayName: string;
  city?: string;
  country?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

  constructor(private usersService: UsersService) {}

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      this.logger.warn(`Signup attempt with existing email: ${dto.email}`);
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName,
      phone: dto.phone,
      city: dto.city,
      country: dto.country,
      lat: dto.lat,
      lng: dto.lng,
    });

    const userId = (user as any)._id?.toString() || (user as any).id;

    const tokenUser: TokenUser = {
      id: userId,
      email: user.email,
      displayName: user.displayName,
      city: user.city,
      country: user.country,
    };

    this.logger.log(`New user registered: ${user.email}`);

    return {
      access_token: this.generateToken(tokenUser),
      user: tokenUser,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await this.verifyPassword(dto.password, user.password))) {
      this.logger.warn(`Failed login attempt for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = (user as any)._id?.toString() || (user as any).id;

    const tokenUser: TokenUser = {
      id: userId,
      email: user.email,
      displayName: user.displayName,
      city: user.city,
      country: user.country,
    };

    this.logger.log(`User logged in: ${user.email}`);

    return {
      access_token: this.generateToken(tokenUser),
      user: tokenUser,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  private generateToken(user: TokenUser): string {
    return jwt.sign(
      { sub: user.id, email: user.email, displayName: user.displayName },
      this.jwtSecret,
      { expiresIn: '7d' },
    );
  }
}
