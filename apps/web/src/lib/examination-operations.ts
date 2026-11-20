export type RemoteChoice = { id: string; label: string; detail?: string };
export function retainChoice(
  current: RemoteChoice | null,
  incoming: RemoteChoice | null,
) {
  // Explicit selection/clear only; result ordering and paging never choose a new ID.
  return incoming === null
    ? null
    : current?.id === incoming.id
      ? { ...current, ...incoming }
      : incoming;
}
export type PreparationQuestion = { type?: string; points: number | string };
export function preparationSummary(
  title: string,
  durationMin: number,
  questions: PreparationQuestion[],
) {
  const blockers: string[] = [],
    types: Record<string, number> = {
      SINGLE_CHOICE: 0,
      MULTIPLE_CHOICE: 0,
      MATCHING: 0,
    };
  let cents = 0;
  if (title.trim().length < 2 || title.trim().length > 200)
    blockers.push('Tên đề cần từ 2 đến 200 ký tự.');
  if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 1440)
    blockers.push('Thời lượng cần từ 1 đến 1440 phút.');
  if (questions.length < 1 || questions.length > 200)
    blockers.push('Chọn từ 1 đến 200 câu hỏi.');
  for (const q of questions) {
    const points = Number(q.points);
    if (
      !Number.isFinite(points) ||
      points <= 0 ||
      points > 999999.99 ||
      Math.abs(points * 100 - Math.round(points * 100)) > 1e-7
    )
      blockers.push('Có điểm câu hỏi không hợp lệ.');
    else cents += Math.round(points * 100);
    if (q.type && q.type in types) types[q.type]++;
  }
  if (cents > 99999999) blockers.push('Tổng điểm vượt giới hạn lưu trữ.');
  return {
    blockers: [...new Set(blockers)],
    questionCount: questions.length,
    totalPoints: blockers.some((s) => s.includes('điểm'))
      ? null
      : (cents / 100).toFixed(2),
    types,
  };
}
export function deadlineGuidance(
  item: {
    closesAt: string | null;
    attempts?: Array<{ status: string; deadlineAt?: string | null }>;
  },
  serverNow: string | undefined,
) {
  const active = item.attempts?.find((a) => a.status === 'IN_PROGRESS');
  if (active?.deadlineAt)
    return {
      kind: 'active' as const,
      at: active.deadlineAt,
      label: 'Hạn lượt đang làm do máy chủ cấp',
    };
  const now = Date.parse(serverNow ?? ''),
    close = Date.parse(item.closesAt ?? '');
  if (!Number.isFinite(now) || !Number.isFinite(close)) return null;
  const delta = close - now;
  return delta > 0 && delta <= 24 * 60 * 60 * 1000
    ? {
        kind: 'closing' as const,
        at: item.closesAt!,
        label: 'Bài giao đóng trong 24 giờ tính tại lần tải gần nhất',
      }
    : null;
}
export function readStudentOperationContext(q: Record<string, unknown>) {
  return {
    search: typeof q.search === 'string' ? q.search.slice(0, 200) : '',
    page:
      typeof q.page === 'string' && /^[1-9]\d{0,5}$/.test(q.page)
        ? Number(q.page)
        : 1,
    scheduleOrder:
      q.scheduleOrder === 'opening' || q.scheduleOrder === 'closing'
        ? q.scheduleOrder
        : ('recent' as 'recent' | 'opening' | 'closing'),
  };
}
