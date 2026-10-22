import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  CurrentUser,
  LoginInput,
  ChangePasswordInput,
} from '@exam/shared';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { TokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {
    this.accessSecret = this.requireSecret('JWT_ACCESS_SECRET');
    this.refreshSecret = this.requireSecret('JWT_REFRESH_SECRET');
    if (this.accessSecret === this.refreshSecret)
      throw new Error('JWT secrets must differ');
  }

  private requireSecret(name: string): string {
    const value = process.env[name];
    if (!value || value.length < 32)
      throw new Error(`${name} must be at least 32 characters`);
    return value;
  }

  private view(user: {
    id: string;
    email: string;
    fullName: string;
    role: CurrentUser['role'];
  }): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private async issue(user: {
    id: string;
    role: CurrentUser['role'];
    tokenVersion: number;
  }) {
    const base = { sub: user.id, role: user.role, version: user.tokenVersion };
    const accessToken = await this.jwt.signAsync(
      { ...base, kind: 'access', jti: randomUUID() } satisfies TokenPayload,
      { secret: this.accessSecret, expiresIn: '15m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, kind: 'refresh', jti: randomUUID() } satisfies TokenPayload,
      { secret: this.refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (
      !user ||
      !user.isActive ||
      !(await argon2.verify(user.passwordHash, input.password))
    )
      throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.issue(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await argon2.hash(tokens.refreshToken) },
    });
    return { user: this.view(user), ...tokens };
  }

  async refresh(token: string | undefined) {
    if (!token) throw new UnauthorizedException();
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.kind !== 'refresh') throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash ||
      user.tokenVersion !== payload.version ||
      !(await argon2.verify(user.refreshTokenHash, token))
    )
      throw new UnauthorizedException();
    const tokens = await this.issue(user);
    const updated = await this.prisma.user.updateMany({
      where: { id: user.id, refreshTokenHash: user.refreshTokenHash },
      data: { refreshTokenHash: await argon2.hash(tokens.refreshToken) },
    });
    if (updated.count !== 1)
      throw new UnauthorizedException('Refresh token was already used');
    return { user: this.view(user), ...tokens };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
      if (payload.kind !== 'refresh') return;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (
        user?.refreshTokenHash &&
        (await argon2.verify(user.refreshTokenHash, token))
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null, tokenVersion: { increment: 1 } },
        });
      }
    } catch {
      /* Invalid cookie is cleared by the controller. */
    }
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await argon2.verify(user.passwordHash, input.currentPassword))
    )
      throw new UnauthorizedException('Current password is incorrect');
    if (input.currentPassword === input.newPassword)
      throw new BadRequestException('New password must differ');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await argon2.hash(input.newPassword),
        refreshTokenHash: null,
        tokenVersion: { increment: 1 },
      },
    });
  }
}
