'use client';
import type { ReactNode } from 'react';
export {
  ConfirmationDialog,
  DataTable,
  EmptyState,
  ErrorState,
  StatusBadge,
  useAdminAction as useTeacherAction,
} from '@/components/admin/admin-ui';
export function TeacherHeading({
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
        <p className="eyebrow">STUDIO GIẢNG DẠY</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
