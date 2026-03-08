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

interface TokenUser {
  id: string;
  email: string;
  displayName: string;
}

interface InMemoryUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private users: InMemoryUser[] = [];
  private idCounter = 1;
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

  async signup(dto: SignupDto) {
    const existing = this.users.find(u => u.email === dto.email);

    if (existing) {
      this.logger.warn(`Signup attempt with existing email: ${dto.email}`);
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const user: InMemoryUser = {
      id: String(this.idCounter++),
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName,
    };
    
    this.users.push(user);

    const tokenUser: TokenUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };

    this.logger.log(`New user registered: ${user.email}`);

    return {
      access_token: this.generateToken(tokenUser),
      user: tokenUser,
    };
  }

  async login(dto: LoginDto) {
    const user = this.users.find(u => u.email === dto.email);

    if (!user || !(await this.verifyPassword(dto.password, user.password))) {
      this.logger.warn(`Failed login attempt for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenUser: TokenUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };

    this.logger.log(`User logged in: ${user.email}`);

    return {
      access_token: this.generateToken(tokenUser),
      user: tokenUser,
    };
  }

  async validateUser(userId: string) {
    return this.users.find(u => u.id === userId) || null;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  private generateToken(user: TokenUser): string {
    return jwt.sign(
      { sub: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '7d' },
    );
  }
}
