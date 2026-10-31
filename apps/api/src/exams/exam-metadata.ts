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
