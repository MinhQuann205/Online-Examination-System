import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, RolesGuard } from './guards';
import type { PrismaService } from '../prisma/prisma.service';

function context(request: object): ExecutionContext {
  return {
    getHandler: () => () => null,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('authorization guards', () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(48);
  });

  it('refuses a request without an access cookie before data is exposed', async () => {
    const guard = new AuthGuard(
      new Reflector(),
      new JwtService(),
      {} as PrismaService,
    );
    await expect(
      guard.canActivate(context({ cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a student at the teacher endpoint', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['TEACHER']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() =>
      guard.canActivate(context({ user: { role: 'STUDENT' } })),
    ).toThrow(ForbiddenException);
  });

  it('lets a teacher reach the teacher endpoint', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['TEACHER']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(context({ user: { role: 'TEACHER' } }))).toBe(
      true,
    );
  });
});
