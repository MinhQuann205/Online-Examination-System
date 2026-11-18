import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
// Read only configured structure; never project question content or answer keys.
const schema = z.object({
  durationMin: z.number().int().min(1).max(1440),
  questions: z
    .array(
      z.object({
        points: z
          .number()
          .positive()
          .max(999999.99)
          .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7),
      }),
    )
    .max(200),
});
export function snapshotStructure(value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  const total = parsed.data.questions.reduce(
    (sum, q) => sum.plus(String(q.points)),
    new Prisma.Decimal(0),
  );
  if (total.gt('999999.99')) return null;
  return {
    questionCount: parsed.data.questions.length,
    totalPoints: total.toFixed(2),
    durationMin: parsed.data.durationMin,
  };
}
