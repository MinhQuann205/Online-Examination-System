'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@exam/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/admin-ui';
import './results.css';
export type ResultRole = CurrentUser['role'];
export const resultDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';
export const stateLabel = (status: string) =>
  ({
    SUBMITTED: 'Đã nộp',
    EXPIRED: 'Hết giờ',
    IN_PROGRESS: 'Đang làm',
    DRAFT: 'Bản nháp',
    PUBLISHED: 'Đã phát hành',
    ARCHIVED: 'Đã lưu trữ',
  })[status] ?? status;
export function ResultStatus({ status }: { status: string }) {
  return (
    <StatusBadge
      tone={
        status === 'SUBMITTED'
          ? 'success'
          : status === 'EXPIRED'
            ? 'neutral'
            : 'primary'
      }
    >
      {stateLabel(status)}
    </StatusBadge>
  );
}
export function useResultActor(role: ResultRole) {
  const router = useRouter(),
    session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  const allowed = !session.isError && session.data?.role === role;
  useEffect(() => {
    if (
      session.error instanceof Error &&
      'status' in session.error &&
      session.error.status === 401
    )
      router.replace('/login');
    else if (session.data && !session.isError && session.data.role !== role)
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [session.data, session.error, session.isError, role, router]);
  return { session, allowed, user: allowed ? session.data : undefined };
}
export function ResultError({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div className="results-error-box" role="alert">
      <p>{error.message}</p>
      <Button type="button" variant="outline" onClick={retry}>
        Thử lại
      </Button>
    </div>
  );
}
export function ResultsHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <p className="eyebrow">EXAMSPACE · KẾT QUẢ</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
export type ResultQuestion = {
  questionId: string;
  type: string;
  content: string;
  position?: number;
  points: number;
  answer: unknown;
  awarded: string | null;
  explanation?: string | null;
  options: Array<{ id: string; content: string; isCorrect?: boolean }>;
  matchingPairs: Array<{
    id: string;
    leftText: string;
    rightText?: string;
    rightId?: string;
  }>;
  matchingOptions?: Array<{ id: string; rightText: string }>;
};
export type ResultDetail = {
  id: string;
  status: string;
  exam: { id: string; title: string; durationMin: number | null };
  startedAt: string;
  submittedAt: string | null;
  deadlineAt?: string | null;
  score: string | null;
  maxScore: string | null;
  correctCount: number | null;
  wrongCount: number | null;
  unansweredCount: number | null;
  questions: ResultQuestion[];
};
