import type { AuthRequest } from './auth/auth.types';
import type { PrismaService } from './prisma/prisma.service';
import { ExamAssignmentsService } from './exam-assignments/exam-assignments.service';
import { historicalExamDescription } from './exams/exam-metadata';
import { resultAssignmentScope } from './results/result-scope';

const teacher: AuthRequest['user'] = {
  id: '10000000-0000-4000-8000-000000000001',
  role: 'TEACHER',
  email: 'teacher@example.test',
  fullName: 'Teacher',
};
const student: AuthRequest['user'] = {
  ...teacher,
  id: '10000000-0000-4000-8000-000000000002',
  role: 'STUDENT',
};
const id = '20000000-0000-4000-8000-000000000001',
  versionId = '30000000-0000-4000-8000-000000000001';
function setup() {
  const assignment = {
    id,
    createdById: teacher.id,
    classId: null,
    studentId: student.id,
    examVersion: { id: versionId, number: 1 },
    exam: { id, title: 'Mutable V2', durationMin: 99, status: 'DRAFT' },
    attempts: [{ id: 'own-attempt', status: 'IN_PROGRESS' }],
  };
  const db = {
    examAssignment: {
      findFirst: jest.fn().mockResolvedValue(assignment),
      findUnique: jest.fn().mockResolvedValue({ id }),
    },
    examVersion: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: versionId,
          snapshot: {
            title: 'Pinned V1',
            durationMin: 30,
            description: 'V1 instructions',
            questions: [{ isCorrect: true, correctPairs: ['private-key'] }],
          },
        },
      ]),
    },
  };
  return {
    db,
    service: new ExamAssignmentsService(db as unknown as PrismaService),
  };
}
describe('Practical assignment detail public metadata', () => {
  it('only projects a public description, ignoring an accompanying private key tree', () => {
    expect(
      historicalExamDescription({
        description: 'Read instructions',
        questions: [{ isCorrect: true }],
        answerKey: 'private',
      }),
    ).toBe('Read instructions');
  });
  it('missing, malformed or oversized description does not invent content', () => {
    for (const raw of [
      null,
      {},
      { description: 45 },
      { description: 'x'.repeat(5001) },
    ])
      expect(historicalExamDescription(raw)).toBeNull();
  });
  it('Student detail uses pinned V1 description and caller-only attempts without leaking snapshot keys', async () => {
    const { db, service } = setup(),
      result = await service.get(id, student);
    expect(result.exam).toMatchObject({
      title: 'Pinned V1',
      durationMin: 30,
      description: 'V1 instructions',
      metadataAvailable: true,
    });
    expect(JSON.stringify(result)).not.toContain('isCorrect');
    expect(JSON.stringify(result)).not.toContain('private-key');
    expect(db.examAssignment.findFirst.mock.calls[1][0]).toMatchObject({
      where: { id },
      include: {
        attempts: { where: { studentId: student.id } },
        _count: { select: { attempts: { where: { studentId: student.id } } } },
      },
    });
    expect(result).toHaveProperty('attempts');
  });
  it('Teacher detail keeps the management scope on its sensitive read and does not expose caller-attempt projection', async () => {
    const { db, service } = setup(),
      result = await service.get(id, teacher);
    expect(db.examAssignment.findFirst.mock.calls[1][0].where).toEqual({
      id,
      ...resultAssignmentScope(teacher),
    });
    expect(result).not.toHaveProperty('attempts');
    expect(result.exam.description).toBe('V1 instructions');
  });
  it('a denied management detail does not read the version snapshot', async () => {
    const { db, service } = setup();
    db.examAssignment.findFirst.mockResolvedValue(null);
    await expect(service.get(id, teacher)).rejects.toMatchObject({
      status: 403,
    });
    expect(db.examVersion.findMany).not.toHaveBeenCalled();
  });
  it('Student is denied the management recipients endpoint before querying private students', async () => {
    const { db, service } = setup();
    await expect(service.students(id, student)).rejects.toMatchObject({
      status: 403,
    });
    expect(db.examAssignment.findFirst).not.toHaveBeenCalled();
  });
});
