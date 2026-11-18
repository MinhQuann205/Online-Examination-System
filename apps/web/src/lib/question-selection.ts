import { validPointText } from '@exam/shared';
export type BankQuestion = {
  id: string;
  content: string;
  type: string;
  topic?: string | null;
  difficulty?: string;
};
export function filterBank<T extends BankQuestion>(
  items: T[],
  search: string,
  type: string,
  topic: string,
  difficulty: string,
): T[] {
  const text = search.trim().toLocaleLowerCase('vi');
  return items.filter(
    (q) =>
      (!text || q.content.toLocaleLowerCase('vi').includes(text)) &&
      (!type || q.type === type) &&
      (!topic || q.topic === topic) &&
      (!difficulty || q.difficulty === difficulty),
  );
}
export function addQuestions(
  order: string[],
  points: Record<string, string>,
  ids: string[],
  defaultPoints: string,
) {
  const newIds = [...new Set(ids)].filter((id) => !order.includes(id));
  if (order.length + newIds.length > 200)
    throw new Error('Mỗi đề thi tối đa 200 câu hỏi.');
  const value = Number(defaultPoints),
    cents = value * 100;
  if (
    !validPointText(defaultPoints) ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 999999.99 ||
    Math.abs(cents - Math.round(cents)) > 1e-7
  )
    throw new Error(
      'Điểm cho câu mới phải lớn hơn 0 và có tối đa hai chữ số thập phân.',
    );
  return {
    order: [...order, ...newIds],
    points: {
      ...points,
      ...Object.fromEntries(newIds.map((id) => [id, defaultPoints])),
    },
  };
}
