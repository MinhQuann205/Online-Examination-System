'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionDocumentId, sessionLifecycle } from '@/lib/session-lifecycle';
import { hasLocalExamGuard } from '@/lib/exam-session-guard';
import { Button } from '@/components/ui/button';

// Auth cookies are shared by tabs. Discard private views when another tab changes
// the account, but retain the mounted answer queue if a concurrent exam is open.
export function SessionChangeBoundary() {
  const client = useQueryClient();
  const [examInterrupted, setExamInterrupted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('examspace-account-v1');
    channel.onmessage = async (event) => {
      if (
        event.data?.type !== 'account-changed' ||
        typeof event.data.sender !== 'string' ||
        event.data.sender === sessionDocumentId
      )
        return;
      sessionLifecycle.invalidate();
      if (hasLocalExamGuard()) {
        setExamInterrupted(true);
        return;
      }
      await client.cancelQueries();
      client.clear();
      window.location.replace('/login');
    };
    return () => channel.close();
  }, [client]);
  useEffect(() => {
    if (examInterrupted) dialog.current?.showModal();
  }, [examInterrupted]);
  if (!examInterrupted) return null;
  return (
    <dialog
      ref={dialog}
      className="logout-dialog"
      aria-labelledby="session-change-title"
      aria-describedby="session-change-description"
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id="session-change-title">Tài khoản đã thay đổi ở tab khác</h2>
      <p id="session-change-description">
        Bài làm đang được giữ trên trang này. Máy chủ có thể không nhận thêm câu
        trả lời của phiên cũ. Chưa có thao tác nộp bài hoặc bỏ bản nháp nào được
        thực hiện.
      </p>
      <p className="dialog-note">
        Liên hệ giảng viên nếu cần hỗ trợ. Chỉ rời trang khi bạn đã quyết định
        cách xử lý bài làm chưa được xác nhận lưu.
      </p>
      <div className="dialog-actions">
        <Button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Rời trang sẽ bỏ các thay đổi chưa được máy chủ xác nhận. Bạn vẫn muốn đến trang đăng nhập?',
              )
            )
              window.location.replace('/login');
          }}
        >
          Đến trang đăng nhập
        </Button>
      </div>
    </dialog>
  );
}
