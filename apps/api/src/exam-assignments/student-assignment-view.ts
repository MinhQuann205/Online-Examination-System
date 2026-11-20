import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client';
export const assignmentViewSchema = z.enum([
  'all',
  'upcoming',
  'open',
  'in_progress',
  'completed',
]);
export function studentAssignmentView(
  view: z.infer<typeof assignmentViewSchema>,
  studentId: string,
  now: Date,
): Prisma.ExamAssignmentWhereInput {
  const active = { studentId, status: 'IN_PROGRESS' as const };
  if (view === 'all') return {};
  if (view === 'in_progress') return { attempts: { some: active } };
  if (view === 'completed')
    return {
      AND: [
        { attempts: { none: active } },
        {
          attempts: {
            some: { studentId, status: { in: ['SUBMITTED', 'EXPIRED'] } },
          },
        },
      ],
    };
  const unstarted: Prisma.ExamAssignmentWhereInput = {
    examVersionId: { not: null },
    exam: { is: { status: { not: 'ARCHIVED' } } },
    attempts: { none: { studentId } },
  };
  return view === 'upcoming'
    ? { AND: [unstarted, { opensAt: { gt: now } }] }
    : {
        AND: [
          unstarted,
          { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
          { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
        ],
      };
}
