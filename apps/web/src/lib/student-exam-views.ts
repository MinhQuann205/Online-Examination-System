export const studentExamViews = {
  all: 'Tất cả bài giao',
  upcoming: 'Sắp mở, chưa làm',
  open: 'Đang mở, chưa làm',
  in_progress: 'Đang làm dở',
  completed: 'Đã hoàn tất',
} as const;
export type StudentExamView = keyof typeof studentExamViews;
export function readStudentExamView(value: unknown): StudentExamView {
  return typeof value === 'string' && Object.hasOwn(studentExamViews, value)
    ? (value as StudentExamView)
    : 'all';
}
