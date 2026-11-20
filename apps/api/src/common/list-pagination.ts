import { z } from 'zod';

// Validate before building Prisma skip/take; fractional/non-finite values are not pages.
export const listPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
