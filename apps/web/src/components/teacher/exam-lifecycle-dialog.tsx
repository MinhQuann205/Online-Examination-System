'use client';
import { ConfirmationDialog } from './teacher-ui';

export type ExamLifecycleAction = 'publish' | 'version' | 'archive';
const text = {
  publish: {
    title: 'Xuất bản đề thi?',
    actionLabel: 'Xuất bản đề thi',
    description:
      'Nội dung, thứ tự câu hỏi và điểm trong bản nháp sẽ được đóng băng thành phiên bản đã xuất bản. Xuất bản chưa tự giao bài cho học viên.',
  },
  version: {
    title: 'Tạo bản nháp mới?',
    actionLabel: 'Tạo bản nháp mới',
    description:
      'Tạo bản nháp để chỉnh sửa tiếp. Các phiên bản đã xuất bản, bài đã giao và kết quả cũ vẫn giữ nguyên.',
  },
  archive: {
    title: 'Lưu trữ đề thi?',
    actionLabel: 'Lưu trữ đề thi',
    description:
      'Đề được lưu trữ sẽ không được dùng để giao bài hoặc bắt đầu lượt mới. Lịch sử, phiên bản và kết quả không bị xóa; thao tác này không nộp thay lượt đang làm.',
  },
};
export function ExamLifecycleDialog({
  kind,
  title,
  onConfirm,
  onClose,
}: {
  kind: ExamLifecycleAction;
  title: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <ConfirmationDialog
      {...text[kind]}
      description={`${title}. ${text[kind].description}`}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
