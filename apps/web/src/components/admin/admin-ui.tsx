'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Inbox, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow">Không gian quản trị</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'primary';
}) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-empty" role="status">
      <Inbox size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="admin-error" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <span>
        {error.message || 'Không tải được dữ liệu. Vui lòng thử lại.'}
      </span>
      {retry && (
        <Button type="button" variant="outline" onClick={retry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
export function SearchToolbar({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="admin-toolbar">
      <div className="admin-search">
        <label htmlFor={id}>Tìm kiếm</label>
        <div>
          <Search size={18} aria-hidden="true" />
          <Input
            id={id}
            aria-label="Tìm kiếm"
            placeholder="Tìm kiếm..."
            maxLength={150}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
export function DataTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="admin-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="admin-table">
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}
export function ConfirmationDialog({
  title,
  description,
  actionLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    busy = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error('Không thực hiện được yêu cầu.'),
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="logout-dialog admin-confirm"
      aria-labelledby={id}
      aria-describedby={id + '-description'}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy.current) onClose();
      }}
    >
      <h2 id={id}>{title}</h2>
      <p id={id + '-description'}>{description}</p>
      {error && <ErrorState error={error} />}
      <div className="dialog-actions">
        <Button
          type="button"
          variant="outline"
          autoFocus
          disabled={pending}
          onClick={onClose}
        >
          Hủy bỏ
        </Button>
        <Button type="button" disabled={pending} onClick={() => void confirm()}>
          {pending ? 'Đang xử lý...' : error ? 'Thử lại' : actionLabel}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {pending ? 'Đang xử lý yêu cầu' : ''}
      </span>
    </dialog>
  );
}
export function SecretDialog({
  password,
  onClose,
}: {
  password: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (document.hidden) {
      onClose();
      return;
    }
    ref.current?.showModal();
    const hide = () => {
      if (document.hidden) onClose();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose]);
  return (
    <dialog
      ref={ref}
      className="logout-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={id}>Mật khẩu tạm đã được tạo</h2>
      <p>
        Chuyển mật khẩu cho người dùng qua kênh riêng và yêu cầu đổi mật khẩu
        sau khi đăng nhập. Các phiên cũ đã mất hiệu lực.
      </p>
      <label htmlFor={id + '-password'}>Mật khẩu tạm</label>
      <Input
        id={id + '-password'}
        autoComplete="off"
        readOnly
        type={visible ? 'text' : 'password'}
        value={password}
      />
      <div className="dialog-actions">
        <Button
          type="button"
          variant="outline"
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        </Button>
        <Button type="button" autoFocus onClick={onClose}>
          Đóng và xóa khỏi màn hình
        </Button>
      </div>
      <p className="muted">
        Đóng hộp thoại hoặc chuyển sang tab khác sẽ xóa mật khẩu khỏi màn hình
        này.
      </p>
    </dialog>
  );
}
export function useAdminAction() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null);
  async function run(action: () => Promise<unknown>) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error('Không thực hiện được yêu cầu.'),
      );
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { pending, error, run };
}
