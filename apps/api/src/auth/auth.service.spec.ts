import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  const jwt = new JwtService();
  let user: {
    id: string;
    email: string;
    fullName: string;
    role: 'STUDENT';
    isActive: boolean;
    passwordHash: string;
    refreshTokenHash: string | null;
    tokenVersion: number;
  };
  let prisma: PrismaService;
  let service: AuthService;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(48);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(48);
    user = {
      id: '8ca5c77a-a28c-4cae-827f-d4b7919a607a',
      email: 'student@example.test',
      fullName: 'Student',
      role: 'STUDENT',
      isActive: true,
      passwordHash: await argon2.hash('correct-password'),
      refreshTokenHash: null,
      tokenVersion: 0,
    };
    prisma = {
      user: {
        findUnique: jest.fn(async () => user),
        update: jest.fn(async ({ data }: { data: Partial<typeof user> }) => {
          Object.assign(user, data);
          return user;
        }),
        updateMany: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { refreshTokenHash: string };
            data: { refreshTokenHash: string };
          }) => {
            if (user.refreshTokenHash !== where.refreshTokenHash)
              return { count: 0 };
            user.refreshTokenHash = data.refreshTokenHash;
            return { count: 1 };
          },
        ),
      },
    } as unknown as PrismaService;
    service = new AuthService(prisma, jwt);
  });

  it('logs in with the correct password and stores only a refresh hash', async () => {
    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });
    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: 'STUDENT',
    });
    expect(user.refreshTokenHash).not.toBe(result.refreshToken);
    expect(
      await argon2.verify(user.refreshTokenHash!, result.refreshToken),
    ).toBe(true);
  });

  it('rejects a wrong password', async () => {
    await expect(
      service.login({ email: user.email, password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(user.refreshTokenHash).toBeNull();
  });

  it('rotates a refresh token and rejects reuse', async () => {
    const first = await service.login({
      email: user.email,
      password: 'correct-password',
    });
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
    expect((await service.refresh(second.refreshToken)).user.id).toBe(user.id);
  });
});
