import { z } from 'zod';

const option = z.object({
  content: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});
const pair = z.object({
  leftText: z.string().trim().min(1).max(500),
  rightText: z.string().trim().min(1).max(500),
});
export const questionInputSchema = z
  .object({
    type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']),
    content: z.string().trim().min(1).max(10000),
    explanation: z.string().trim().max(5000).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    topic: z.string().trim().max(120).optional(),
    options: z.array(option).optional(),
    matchingPairs: z.array(pair).optional(),
  })
  .superRefine((v, c) => {
    if (v.type === 'MATCHING') {
      if (!v.matchingPairs || v.matchingPairs.length < 2)
        c.addIssue({
          code: 'custom',
          message: 'Cần ít nhất hai cặp ghép',
          path: ['matchingPairs'],
        });
      if (v.options?.length)
        c.addIssue({
          code: 'custom',
          message: 'Câu ghép không dùng options',
          path: ['options'],
        });
      for (const side of ['leftText', 'rightText'] as const) {
        const values = v.matchingPairs?.map((item) => item[side]) ?? [];
        if (new Set(values).size !== values.length)
          c.addIssue({
            code: 'custom',
            message:
              'Nội dung cần ghép và đáp án tương ứng phải khác nhau giữa các cặp',
            path: ['matchingPairs'],
          });
      }
    } else {
      if (!v.options || v.options.length < 2)
        c.addIssue({
          code: 'custom',
          message: 'Cần ít nhất hai lựa chọn',
          path: ['options'],
        });
      const correct = v.options?.filter((o) => o.isCorrect).length ?? 0;
      if (correct === 0 || (v.type === 'SINGLE_CHOICE' && correct !== 1))
        c.addIssue({
          code: 'custom',
          message: 'Số đáp án đúng không phù hợp loại câu hỏi',
          path: ['options'],
        });
      if (v.matchingPairs?.length)
        c.addIssue({
          code: 'custom',
          message: 'Câu trắc nghiệm không dùng matchingPairs',
          path: ['matchingPairs'],
        });
      const contents = v.options?.map((item) => item.content) ?? [];
      if (new Set(contents).size !== contents.length)
        c.addIssue({
          code: 'custom',
          message: 'Nội dung các lựa chọn phải khác nhau',
          path: ['options'],
        });
    }
  });
