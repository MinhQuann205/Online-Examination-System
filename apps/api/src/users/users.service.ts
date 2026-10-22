import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const createSchema = z.object({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(2).max(150),
  role: z.enum(['TEACHER', 'STUDENT']),
  password: z.string().min(12).max(128),
});
const patchSchema = z
  .object({
    email: z.email().trim().toLowerCase().optional(),
    fullName: z.string().trim().min(2).max(150).optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  active: z.enum(['true', 'false']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
const safeSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
@Injectable()
export class UsersService {
  constructor(private db: PrismaService) {}
  async list(query: unknown, actor: { id: string; role: Role }) {
    const q = pageSchema.parse(query);
    const where: Prisma.UserWhereInput = {};
    if (q.role) where.role = q.role;
    if (actor.role === 'TEACHER') {
      if (q.role && q.role !== 'STUDENT') throw new ForbiddenException();
      where.role = 'STUDENT';
      where.memberships = { some: { class: { teacherId: actor.id } } };
    }
    if (q.active) where.isActive = q.active === 'true';
    if (q.search)
      where.OR = [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: safeSelect,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: q.order },
      }),
      this.db.user.count({ where }),
    ]);
    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      pageCount: Math.ceil(total / q.limit),
    };
  }
  async create(input: unknown) {
    const dto = createSchema.parse(input);
    try {
      return await this.db.user.create({
        data: {
          ...dto,
          role: dto.role as Role,
          passwordHash: await argon2.hash(dto.password),
        },
        select: safeSelect,
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Email đã được sử dụng');
      throw e;
    }
  }
  async get(id: string, actor: { id: string; role: Role }) {
    if (actor.role === 'STUDENT' && actor.id !== id)
      throw new ForbiddenException();
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        ...safeSelect,
        memberships: {
          select: {
            classId: true,
            class: {
              select: {
                name: true,
                code: true,
                teacher: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (actor.role === 'TEACHER' && user.role === 'STUDENT') {
      const enrolled = await this.db.classMember.findFirst({
        where: { studentId: id, class: { teacherId: actor.id } },
      });
      if (!enrolled) throw new ForbiddenException();
    }
    return user;
  }
  async update(id: string, actor: { id: string; role: Role }, input: unknown) {
    const dto = patchSchema.parse(input);
    const target = await this.db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException();
    if (actor.role === 'STUDENT' && actor.id !== id)
      throw new ForbiddenException();
    if (actor.role === 'TEACHER') throw new ForbiddenException();
    if (target.role === 'ADMIN' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    try {
      return await this.db.user.update({
        where: { id },
        data: dto,
        select: safeSelect,
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Email đã được sử dụng');
      throw e;
    }
  }
  async status(id: string, active: boolean) {
    const target = await this.db.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new NotFoundException();
    if (target.role === 'ADMIN' && target.isActive && !active) {
      const count = await this.db.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (count <= 1)
        throw new BadRequestException('Không thể khóa quản trị viên cuối cùng');
    }
    return this.db.user.update({
      where: { id },
      data: {
        isActive: active,
        refreshTokenHash: active ? undefined : null,
        tokenVersion: { increment: 1 },
      },
      select: safeSelect,
    });
  }
  async resetPassword(id: string) {
    const password = randomBytes(18).toString('base64url');
    const user = await this.db.user.updateMany({
      where: { id },
      data: {
        passwordHash: await argon2.hash(password),
        refreshTokenHash: null,
        tokenVersion: { increment: 1 },
      },
    });
    if (!user.count) throw new NotFoundException();
    return { temporaryPassword: password, mustChangePassword: true };
  }
}
