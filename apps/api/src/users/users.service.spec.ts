import * as argon2 from 'argon2';
import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService regression', () => {
  const id = '10000000-0000-4000-8000-000000000001';
  const body = {
    email: 'new@example.test',
    fullName: 'New learner',
    password: 'Test-only-password!123',
    role: 'STUDENT',
  };
  it('maps only model fields and hashes the password', async () => {
    const db = {
      user: { create: jest.fn().mockResolvedValue({ id, email: body.email }) },
    };
    const result = await new UsersService(
      db as unknown as PrismaService,
    ).create(body);
    const data = db.user.create.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual([
      'email',
      'fullName',
      'passwordHash',
      'role',
    ]);
    expect(await argon2.verify(data.passwordHash, body.password)).toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
  });
  it('translates duplicate email to 409', async () => {
    const db = {
      user: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) },
    };
    await expect(
      new UsersService(db as unknown as PrismaService).create(body),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rejects invalid input before writing', async () => {
    const db = { user: { create: jest.fn() } };
    await expect(
      new UsersService(db as unknown as PrismaService).create({
        ...body,
        email: 'invalid',
      }),
    ).rejects.toThrow();
    expect(db.user.create).not.toHaveBeenCalled();
  });
  it('does not let Teacher edit user details', async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id, role: 'STUDENT' }),
        update: jest.fn(),
      },
    };
    await expect(
      new UsersService(db as unknown as PrismaService).update(
        id,
        { id, role: 'TEACHER' },
        { fullName: 'Changed' },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
