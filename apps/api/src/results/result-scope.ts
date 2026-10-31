import type { AuthRequest } from '../auth/auth.types';
import type { Prisma } from '../generated/prisma/client';

// Class results follow the current class manager, including historical attempts.
// Direct results require both assignment creation and current student management.
export function resultAssignmentScope(
  actor: AuthRequest['user'],
): Prisma.ExamAssignmentWhereInput {
  if (actor.role === 'ADMIN') return {};
  if (actor.role !== 'TEACHER')
    throw new Error('Result management scope requires Teacher or Admin');
  return {
    OR: [
      { class: { is: { teacherId: actor.id } } },
      {
        classId: null,
        createdById: actor.id,
        student: {
          is: { memberships: { some: { class: { teacherId: actor.id } } } },
        },
      },
    ],
  };
}
