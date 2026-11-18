'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/teacher/teacher-ui';

export function ClassArchiveAction({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  archived: boolean;
}) {
  const [targetArchived, setTargetArchived] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const cache = useQueryClient();
  return (
    <div className="space-y-3">
      <p className="muted">
        Trạng thái lớp: {archived ? 'Đã lưu trữ' : 'Đang hoạt động'}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setNotice('');
          setTargetArchived(!archived);
        }}
      >
        {archived ? 'Khôi phục lớp' : 'Lưu trữ lớp'}
      </Button>
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      {targetArchived !== null && (
        <ConfirmationDialog
          title={targetArchived ? 'Lưu trữ lớp học?' : 'Khôi phục lớp học?'}
          description={`${name}. ${targetArchived ? 'Lớp sẽ được chuyển sang danh sách đã lưu trữ.' : 'Lớp sẽ xuất hiện lại trong danh sách đang hoạt động.'} Thành viên, bài giao và lịch sử lượt làm được giữ nguyên; thao tác này không hủy bài thi.`}
          actionLabel={
            targetArchived ? 'Xác nhận lưu trữ lớp' : 'Xác nhận khôi phục lớp'
          }
          onClose={() => setTargetArchived(null)}
          onConfirm={async () => {
            if (targetArchived === null) return;
            setPending(true);
            try {
              await api.updateClass(id, { isArchived: targetArchived });
              setNotice(
                targetArchived
                  ? 'Đã lưu trữ lớp học.'
                  : 'Đã khôi phục lớp học.',
              );
              await cache.invalidateQueries();
            } finally {
              setPending(false);
            }
          }}
        />
      )}
    </div>
  );
}
