import type { AuthRequest } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from './classes.service';

describe('ClassesService resource ownership', () => {
  const id = '10000000-0000-4000-8000-000000000001';
  const other = '10000000-0000-4000-8000-000000000002';
  const teacher: AuthRequest['user'] = {
    id,
    role: 'TEACHER',
    fullName: 'Teacher',
    email: 'teacher@example.test',
  };
  const db = () => ({
    class: {
      findUnique: jest.fn().mockResolvedValue({ teacherId: id }),
      update: jest.fn().mockResolvedValue({ id }),
    },
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ role: 'TEACHER', isActive: true }),
    },
  });
  it('denies Student updates before accessing data', async () => {
    await expect(
      new ClassesService({} as PrismaService).update(
        id,
        { ...teacher, role: 'STUDENT' },
        { name: 'Changed' },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('denies another class teacher', async () => {
    const mock = db();
    await expect(
      new ClassesService(mock as unknown as PrismaService).update(
        id,
        { ...teacher, id: other },
        { name: 'Changed' },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(mock.class.update).not.toHaveBeenCalled();
  });
  it('allows owner edits but reserves reassignment for Admin', async () => {
    const mock = db(),
      service = new ClassesService(mock as unknown as PrismaService);
    await service.update(id, teacher, { description: 'Owned class' });
    await expect(
      service.update(id, teacher, { teacherId: other }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mock.class.update).toHaveBeenCalledTimes(1);
  });
  it('validates the new teacher before Admin reassignment', async () => {
    const mock = db();
    mock.user.findUnique.mockResolvedValue({ role: 'STUDENT', isActive: true });
    await expect(
      new ClassesService(mock as unknown as PrismaService).update(
        id,
        { ...teacher, role: 'ADMIN' },
        { teacherId: other },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(mock.class.update).not.toHaveBeenCalled();
  });
});
