import type { ExamAssignment } from './api';

// Display guidance only; start/resume always asks the backend to authorize and finalize.
export function assignmentAvailability(item: ExamAssignment, now: number) {
  if (!now) return 'Đang kiểm tra lịch';
  if (
    !item.examVersion ||
    !item.exam.metadataAvailable ||
    item.exam.status === 'ARCHIVED'
  )
    return 'Không còn khả dụng';
  if (item.opensAt && now < Date.parse(item.opensAt)) return 'Chưa đến giờ';
  if (item.closesAt && now >= Date.parse(item.closesAt)) return 'Đã đóng';
  if (item._count.attempts >= item.maxAttempts) return 'Đã hết lượt làm bài';
  return 'Đang mở';
}
