import { z } from 'zod';

const metadataSchema = z.object({
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
});

// Never invent a historical title from the mutable Exam for legacy records.
// Project only public metadata, even when input includes a private answer key.
export function historicalExamMetadata(snapshot: unknown) {
  const parsed = metadataSchema.safeParse(snapshot);
  return parsed.success
    ? { ...parsed.data, metadataAvailable: true }
    : {
        title: 'Thông tin phiên bản không khả dụng',
        durationMin: null,
        metadataAvailable: false,
      };
}

// Assignment details may show this public field, never the private question/key tree.
export function historicalExamDescription(snapshot: unknown): string | null {
  const parsed = z
    .object({ description: z.string().max(5000).nullable().optional() })
    .safeParse(snapshot);
  return parsed.success ? (parsed.data.description ?? null) : null;
}
