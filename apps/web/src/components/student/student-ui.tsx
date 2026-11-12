'use client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
export {
  EmptyState,
  ErrorState,
  StatusBadge,
  SearchToolbar,
} from '@/components/admin/admin-ui';
export function StudentHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <p className="eyebrow">KHÔNG GIAN HỌC TẬP</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
export function useStudentSessionError(error: Error | null) {
  const client = useQueryClient();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401)
      void client.invalidateQueries({ queryKey: ['me'] });
  }, [error, client]);
}
export function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : 'Không giới hạn';
}
