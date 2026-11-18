'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from './teacher-ui';
export function AssignmentProgress({
  assignmentId,
  onSelect,
}: {
  assignmentId: string;
  onSelect?: (status: string) => void;
}) {
  const q = useQuery({
    queryKey: ['assignment-progress', assignmentId],
    queryFn: () => api.examAssignmentProgress(assignmentId),
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <Card className="teacher-panel" aria-label="Tiến độ bài giao">
      <div className="admin-section-title">
        <h2>Tiến độ bài giao</h2>
        <Button
          type="button"
          variant="outline"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          Cập nhật tiến độ
        </Button>
      </div>
      {q.isPending ? (
        <p role="status">Đang tổng hợp tiến độ...</p>
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <dl className="admin-detail-grid">
            {[
              ['Người nhận đang hoạt động', q.data.recipients.total, 'all'],
              ['Chưa bắt đầu', q.data.recipients.notStarted, 'not_started'],
              ['Đang làm', q.data.recipients.inProgress, 'in_progress'],
              [
                'Đã hoàn tất, không có lượt đang làm',
                q.data.recipients.completed,
                'completed',
              ],
            ].map(([label, value, status]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {onSelect ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSelect(String(status))}
                      aria-label={'Xem người nhận: ' + label}
                    >
                      {value}
                    </Button>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Tất cả lượt lịch sử: {q.data.attempts.total} · Đang làm:{' '}
            {q.data.attempts.inProgress} · Đã nộp: {q.data.attempts.submitted} ·
            Hết giờ: {q.data.attempts.expired}
          </p>
          <p className="muted">
            Số học viên tính theo người nhận còn hoạt động hiện tại, mỗi người
            một lần. Tổng lượt bao gồm cả lịch sử thành viên đã rời lớp; không
            suy từ trang bảng đang xem. Cập nhật lúc{' '}
            {new Date(q.data.observedAt).toLocaleString('vi-VN')}.
          </p>
        </>
      )}
    </Card>
  );
}
