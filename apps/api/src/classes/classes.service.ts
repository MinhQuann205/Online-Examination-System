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
import { listPaginationSchema } from '../common/list-pagination';
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
const listSchema = listPaginationSchema.extend({
  search: z.string().trim().max(150).optional(),
  archived: z.enum(['false', 'true', 'all']).default('false'),
});
@Injectable()
export class ClassesService {
  constructor(private db: PrismaService) {}
  async list(
    user: AuthRequest['user'],
    query: Record<string, string | undefined>,
  ) {
    const { page, limit, search, archived } = listSchema.parse(query);
    if (user.role === 'STUDENT' && archived !== 'false')
      throw new ForbiddenException(
        'Học viên chỉ xem danh sách lớp đang hoạt động',
      );
    const where: Prisma.ClassWhereInput = {
      ...(archived === 'all' ? {} : { isArchived: archived === 'true' }),
    };
    if (search)
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    if (user.role === 'TEACHER') where.teacherId = user.id;
    if (user.role === 'STUDENT')
      where.members = { some: { studentId: user.id } };
    const [items, total] = await this.db.$transaction([
      this.db.class.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          teacher: { select: { id: true, fullName: true, email: true } },
          _count: { select: { members: true } },
        },
      }),
      this.db.class.count({ where }),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }
  async getWithOptions(
    id: string,
    user: AuthRequest['user'],
    query: unknown = {},
  ) {
    const options = z
      .object({ members: z.enum(['all', 'none']).default('all') })
      .parse(query);
    return options.members === 'none'
      ? this.overview(id, user)
      : this.get(id, user);
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
  async overview(id: string, user: AuthRequest['user']) {
    const item = await this.db.class.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: true } },
      },
    });
    if (!item) throw new NotFoundException();
    if (user.role === 'TEACHER' && item.teacherId !== user.id)
      throw new ForbiddenException();
    if (
      user.role === 'STUDENT' &&
      !(await this.db.classMember.findFirst({
        where: { classId: id, studentId: user.id },
        select: { id: true },
      }))
    )
      throw new ForbiddenException();
    return item;
  }
  async memberPage(id: string, user: AuthRequest['user'], raw: unknown) {
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER')
      throw new ForbiddenException();
    const q = z
      .object({
        paged: z.literal('true').default('true'),
        page: z.coerce.number().int().min(1).max(1000000).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().trim().max(150).optional(),
        active: z.enum(['all', 'true', 'false']).default('all'),
      })
      .parse(raw);
    const scope: Prisma.ClassWhereInput = {
      id,
      ...(user.role === 'TEACHER' ? { teacherId: user.id } : {}),
    };
    const allowed = await this.db.class.findFirst({
      where: scope,
      select: { id: true },
    });
    if (!allowed) throw new ForbiddenException();
    return this.db.$transaction(
      async (tx) => {
        if (!(await tx.class.findFirst({ where: scope, select: { id: true } })))
          throw new ForbiddenException();
        const where: Prisma.ClassMemberWhereInput = {
          classId: id,
          class: { is: scope },
          student: {
            is: {
              ...(q.active !== 'all' ? { isActive: q.active === 'true' } : {}),
              ...(q.search
                ? {
                    OR: [
                      { fullName: { contains: q.search, mode: 'insensitive' } },
                      { email: { contains: q.search, mode: 'insensitive' } },
                    ],
                  }
                : {}),
            },
          },
        };
        const total = await tx.classMember.count({ where }),
          pageCount = Math.ceil(total / q.limit),
          page = Math.min(q.page, Math.max(1, pageCount));
        const items = await tx.classMember.findMany({
          where,
          select: {
            id: true,
            studentId: true,
            student: {
              select: { id: true, fullName: true, email: true, isActive: true },
            },
          },
          orderBy: [{ student: { fullName: 'asc' } }, { studentId: 'asc' }],
          skip: (page - 1) * q.limit,
          take: q.limit,
        });
        return { items, total, page, limit: q.limit, pageCount };
      },
      { isolationLevel: 'RepeatableRead' },
    );
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
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER')
      throw new ForbiddenException();
    const dto = patchSchema.parse(input);
    const c = await this.db.class.findUnique({
      where: { id },
      select: { teacherId: true },
    });
    if (!c) throw new NotFoundException();
    if (user.role === 'TEACHER' && c.teacherId !== user.id)
      throw new ForbiddenException();
    if (dto.teacherId) {
      if (user.role !== 'ADMIN')
        throw new ForbiddenException('Chỉ Admin được phân công giảng viên');
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
    studentId = z.uuid().parse(studentId);
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
