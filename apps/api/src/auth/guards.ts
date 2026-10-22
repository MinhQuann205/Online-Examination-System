import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@exam/shared';
import { IS_PUBLIC, ROLES } from './decorators';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest, TokenPayload } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.access_token as string | undefined;
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      if (payload.kind !== 'access') throw new UnauthorizedException();
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          tokenVersion: true,
        },
      });
      if (
        !user ||
        !user.isActive ||
        user.tokenVersion !== payload.version ||
        user.role !== payload.role
      )
        throw new UnauthorizedException();
      request.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user || !allowed.includes(user.role))
      throw new ForbiddenException('Insufficient role');
    return true;
  }
}
