import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest } from '../auth/auth.types';
const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(2000).optional(),
  teacherId: z.uuid(),
});
const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    teacherId: z.uuid().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
@Injectable()
export class ClassesService {
  constructor(private db: PrismaService) {}
  async list(
    user: AuthRequest['user'],
    query: Record<string, string | undefined>,
  ) {
    const page = Math.max(1, Number(query.page) || 1),
      limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Prisma.ClassWhereInput = { isArchived: false };
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    if (user.role === 'TEACHER') where.teacherId = user.id;
    if (user.role === 'STUDENT')
      where.members = { some: { studentId: user.id } };
    const [items, total] = await this.db.$transaction([
      this.db.class.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { id: true, fullName: true, email: true } },
          _count: { select: { members: true } },
        },
      }),
      this.db.class.count({ where }),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }
  async get(id: string, user: AuthRequest['user']) {
    const item = await this.db.class.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        members: {
          include: {
            student: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException();
    if (user.role === 'TEACHER' && item.teacherId !== user.id)
      throw new ForbiddenException();
    if (
      user.role === 'STUDENT' &&
      !item.members.some((m) => m.studentId === user.id)
    )
      throw new ForbiddenException();
    return item;
  }
  async create(input: unknown) {
    const dto = createSchema.parse(input);
    const teacher = await this.db.user.findUnique({
      where: { id: dto.teacherId },
      select: { role: true, isActive: true },
    });
    if (!teacher || teacher.role !== 'TEACHER' || !teacher.isActive)
      throw new BadRequestException(
        'Phải phân công tài khoản giảng viên đang hoạt động',
      );
    try {
      return await this.db.class.create({
        data: dto,
        include: {
          teacher: { select: { id: true, fullName: true, email: true } },
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Mã lớp đã tồn tại');
      throw e;
    }
  }
  async update(id: string, user: AuthRequest['user'], input: unknown) {
    const dto = patchSchema.parse(input);
    const c = await this.db.class.findUnique({
      where: { id },
      select: { teacherId: true },
    });
    if (!c) throw new NotFoundException();
    if (user.role === 'TEACHER' && c.teacherId !== user.id)
      throw new ForbiddenException();
    if (dto.teacherId) {
      const t = await this.db.user.findUnique({
        where: { id: dto.teacherId },
        select: { role: true, isActive: true },
      });
      if (!t || t.role !== 'TEACHER' || !t.isActive)
        throw new BadRequestException('Giảng viên không hợp lệ');
    }
    return this.db.class.update({
      where: { id },
      data: dto,
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    });
  }
  async addStudent(id: string, studentId: string, user: AuthRequest['user']) {
    const c = await this.db.class.findUnique({
      where: { id },
      select: { teacherId: true },
    });
    if (!c) throw new NotFoundException();
    if (user.role === 'TEACHER' && c.teacherId !== user.id)
      throw new ForbiddenException();
    const s = await this.db.user.findUnique({
      where: { id: studentId },
      select: { role: true, isActive: true },
    });
    if (!s || s.role !== 'STUDENT' || !s.isActive)
      throw new BadRequestException('Học viên không hợp lệ');
    try {
      return await this.db.classMember.create({
        data: { classId: id, studentId },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Học viên đã ở trong lớp');
      throw e;
    }
  }
  async removeStudent(
    id: string,
    studentId: string,
    user: AuthRequest['user'],
  ) {
    const c = await this.db.class.findUnique({
      where: { id },
      select: { teacherId: true },
    });
    if (!c) throw new NotFoundException();
    if (user.role === 'TEACHER' && c.teacherId !== user.id)
      throw new ForbiddenException();
    const result = await this.db.classMember.deleteMany({
      where: { classId: id, studentId },
    });
    if (!result.count) throw new NotFoundException();
    return { deleted: true };
  }
}
