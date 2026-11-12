'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { checkExamBeforeLogout } from '@/lib/exam-session-guard';
import { Button } from '@/components/ui/button';

export function LogoutDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  function close() {
    if (busy.current) return;
    dialog.current?.close();
    trigger.current?.focus();
  }
  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const blocked = await checkExamBeforeLogout();
      if (blocked) {
        setError(blocked);
        return;
      }
      await api.logout();
      await queryClient.cancelQueries();
      queryClient.clear();
      // A new document also discards the Next router cache and component drafts.
      // No other account can reuse a cached server-component tree from this one.
      window.location.replace('/login');
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 403
          ? 'Yêu cầu bị từ chối (403). Chưa xác nhận đăng xuất. Kiểm tra cấu hình Origin rồi thử lại.'
          : cause instanceof Error && cause.name === 'TimeoutError'
            ? 'Máy chủ phản hồi quá lâu. Chưa xác nhận đăng xuất; phiên có thể vẫn còn hiệu lực. Vui lòng thử lại.'
            : 'Không thể xác nhận đăng xuất với máy chủ. Phiên có thể vẫn còn hiệu lực. Kiểm tra kết nối và thử lại.',
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="logout-trigger"
        ref={trigger}
        onClick={() => {
          setError('');
          dialog.current?.showModal();
        }}
      >
        <LogOut size={17} aria-hidden="true" /> Đăng xuất
      </button>
      <dialog
        ref={dialog}
        className="logout-dialog"
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
        onCancel={(event) => {
          if (busy.current) event.preventDefault();
        }}
        onClose={() => trigger.current?.focus()}
      >
        <div className="dialog-icon">
          <LogOut size={24} aria-hidden="true" />
        </div>
        <h2 id="logout-title">Đăng xuất khỏi ExamSpace?</h2>
        <p id="logout-description">
          Bạn sẽ trở về trang đăng nhập. Đăng xuất có thể làm mất hiệu lực các
          phiên đăng nhập khác của tài khoản.
        </p>
        <p className="dialog-note">
          Nếu đang làm bài ở tab khác, hãy kiểm tra trạng thái lưu và rời phòng
          thi trước. Đăng xuất không nộp bài thay bạn.
        </p>
        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}
        <p role="status" className="sr-only">
          {pending ? 'Đang xử lý đăng xuất' : ''}
        </p>
        <div className="dialog-actions">
          <Button
            type="button"
            variant="outline"
            autoFocus
            disabled={pending}
            onClick={close}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void logout()}
          >
            {pending
              ? 'Đang đăng xuất...'
              : error
                ? 'Thử lại'
                : 'Đồng ý đăng xuất'}
          </Button>
        </div>
      </dialog>
    </>
  );
}
