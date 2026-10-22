import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import * as argon2 from 'argon2';

config({ path: resolve(process.cwd(), '../../.env') });

if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seed is disabled in production');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const passwords = {
  ADMIN: process.env.SEED_ADMIN_PASSWORD,
  TEACHER: process.env.SEED_TEACHER_PASSWORD,
  STUDENT: process.env.SEED_STUDENT_PASSWORD,
};
for (const [role, password] of Object.entries(passwords)) {
  if (!password || password.length < 12)
    throw new Error(`SEED_${role}_PASSWORD must be at least 12 characters`);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function seed() {
  const users = [
    {
      email: 'admin@example.test',
      fullName: 'Quản trị viên',
      role: Role.ADMIN,
    },
    {
      email: 'teacher@example.test',
      fullName: 'Giảng viên',
      role: Role.TEACHER,
    },
    {
      email: 'student1@example.test',
      fullName: 'Học viên 1',
      role: Role.STUDENT,
    },
    {
      email: 'student2@example.test',
      fullName: 'Học viên 2',
      role: Role.STUDENT,
    },
    {
      email: 'student3@example.test',
      fullName: 'Học viên 3',
      role: Role.STUDENT,
    },
  ];
  const result = new Map<string, string>();
  for (const user of users) {
    const password = passwords[user.role]!;
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash: await argon2.hash(password) },
      update: { fullName: user.fullName, role: user.role },
    });
    result.set(user.email, saved.id);
  }
  const classroom = await prisma.class.upsert({
    where: { code: 'DEMO-001' },
    create: {
      code: 'DEMO-001',
      name: 'Lớp minh họa',
      teacherId: result.get('teacher@example.test')!,
    },
    update: {
      name: 'Lớp minh họa',
      teacherId: result.get('teacher@example.test')!,
    },
  });
  for (let number = 1; number <= 3; number++) {
    await prisma.classMember.upsert({
      where: {
        classId_studentId: {
          classId: classroom.id,
          studentId: result.get(`student${number}@example.test`)!,
        },
      },
      create: {
        classId: classroom.id,
        studentId: result.get(`student${number}@example.test`)!,
      },
      update: {},
    });
  }
  console.log('Seeded 5 development users and 1 class.');
}

seed().finally(() => prisma.$disconnect());
