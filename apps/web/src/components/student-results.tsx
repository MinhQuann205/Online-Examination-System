'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';

type ResultSummary = {
  id: string;
  exam: { id: string; title: string };
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: string | null;
  maxScore: string | null;
};

type ResultQuestion = {
  questionId: string;
  type: string;
  content: string;
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

type ResultDetail = {
  id: string;
  status: string;
  exam: { title: string };
  startedAt: string;
  submittedAt: string | null;
  score: string | null;
  maxScore: string | null;
  correctCount: number | null;
  wrongCount: number | null;
  unansweredCount: number | null;
  questions: ResultQuestion[];
};

function useStudent() {
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && session.data.role !== 'STUDENT')
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  return session;
}

export function StudentResults() {
  const session = useStudent();
  const [page, setPage] = useState(1);
  const results = useQuery({
    queryKey: ['student-results', page],
    queryFn: () => api.studentResultsPage(page),
    enabled: session.data?.role === 'STUDENT',
  });
  if (session.isPending || !session.data)
    return <main className="p-8 text-slate-500">Đang tải kết quả...</main>;
  const rows = (results.data?.items ?? []) as ResultSummary[];
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Học viên</p>
        <h1 className="mt-1 text-3xl font-bold">Lịch sử kết quả</h1>
      </div>
      {results.error && (
        <p role="alert" className="text-red-600">
          {results.error.message}
        </p>
      )}
      {results.isPending && <p role="status">Đang tải danh sách kết quả...</p>}
      {rows.map((row) => (
        <Card
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-4 p-5"
        >
          <div>
            <h2 className="font-semibold">{row.exam.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {row.status === 'EXPIRED' ? 'Hết giờ' : 'Đã nộp'} ·{' '}
              {row.submittedAt
                ? new Date(row.submittedAt).toLocaleString('vi-VN')
                : '—'}
            </p>
            <p className="mt-1 text-sm">
              {row.score === null
                ? 'Điểm chưa được công bố'
                : `${row.score} / ${row.maxScore}`}
            </p>
          </div>
          <Link href={`/student/results/${row.id}`}>
            <Button type="button" variant="outline">
              Xem bài làm
            </Button>
          </Link>
        </Card>
      ))}
      {!results.isPending && rows.length === 0 && (
        <Card className="p-6 text-sm text-slate-500">
          Chưa có kết quả hoàn thành.
        </Card>
      )}
      {results.data && (
        <Pagination
          page={page}
          total={results.data.total}
          pageCount={results.data.pageCount}
          onPage={setPage}
          busy={results.isFetching}
        />
      )}
    </main>
  );
}

export function StudentResultDetail({ attemptId }: { attemptId: string }) {
  return <ResultDetailView attemptId={attemptId} requiredRole="STUDENT" />;
}

export function TeacherResultDetail({ attemptId }: { attemptId: string }) {
  return <ResultDetailView attemptId={attemptId} requiredRole="TEACHER" />;
}

function ResultDetailView({
  attemptId,
  requiredRole,
}: {
  attemptId: string;
  requiredRole: 'STUDENT' | 'TEACHER';
}) {
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  const allowedRoles = useMemo(
    () => (requiredRole === 'TEACHER' ? ['TEACHER', 'ADMIN'] : [requiredRole]),
    [requiredRole],
  );
  const query = useQuery({
    queryKey: ['result', attemptId],
    queryFn: () => api.result(attemptId),
    enabled: allowedRoles.includes(session.data?.role ?? ''),
    retry: false,
  });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && !allowedRoles.includes(session.data.role))
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [allowedRoles, requiredRole, router, session.data, session.isError]);
  if (session.isPending || query.isPending)
    return <main className="p-8 text-slate-500">Đang tải bài làm...</main>;
  if (query.isError)
    return (
      <main role="alert" className="p-8 text-red-600">
        {query.error.message}
      </main>
    );
  const result = query.data as unknown as ResultDetail;
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8">
      <Link
        href={
          requiredRole === 'STUDENT' ? '/student/results' : '/teacher/results'
        }
        className="text-sm text-blue-700 hover:underline"
      >
        ← Lịch sử kết quả
      </Link>
      <header>
        <p className="text-sm font-semibold text-blue-600">Kết quả bài thi</p>
        <h1 className="mt-1 text-3xl font-bold">{result.exam.title}</h1>
        <p className="mt-2 text-slate-500">
          {result.status === 'EXPIRED' ? 'Hết giờ' : 'Đã nộp'} ·{' '}
          {result.submittedAt
            ? new Date(result.submittedAt).toLocaleString('vi-VN')
            : '—'}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {result.score === null
            ? 'Điểm chưa được công bố'
            : `${result.score} / ${result.maxScore}`}
          {result.correctCount !== null
            ? ` · ${result.correctCount} đúng · ${result.wrongCount} sai · ${result.unansweredCount} chưa trả lời`
            : ''}
        </p>
      </header>
      {result.questions.map((question, index) => {
        const answer = question.answer as {
          optionId?: string;
          optionIds?: string[];
          pairs?: Array<{ leftId: string; rightId: string }>;
        } | null;
        const selected = new Set([
          ...(answer?.optionId ? [answer.optionId] : []),
          ...(answer?.optionIds ?? []),
        ]);
        const matching = answer?.pairs ?? [];
        return (
          <Card key={question.questionId} className="space-y-3 p-5">
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold">
                Câu {index + 1}. {question.content}
              </h2>
              {question.awarded !== null && (
                <span className="text-sm text-slate-500">
                  {question.awarded} điểm
                </span>
              )}
            </div>
            {question.options.map((option) => (
              <div key={option.id} className="flex items-start gap-2 text-sm">
                <span aria-hidden="true">
                  {option.isCorrect === true
                    ? '✓'
                    : selected.has(option.id)
                      ? '●'
                      : '○'}
                </span>
                <span>{option.content}</span>
                {selected.has(option.id) && (
                  <span className="text-xs text-slate-500">Bạn đã chọn</span>
                )}
              </div>
            ))}
            {question.matchingPairs.map((pair) => {
              const rightId = matching.find(
                (entry) => entry.leftId === pair.id,
              )?.rightId;
              const option = question.matchingOptions?.find(
                (item) => item.id === rightId,
              );
              const correctRightId = pair.rightId;
              return (
                <div
                  key={pair.id}
                  className="grid gap-2 text-sm sm:grid-cols-3"
                >
                  <span>{pair.leftText}</span>
                  <span>
                    {option?.rightText ?? pair.rightText ?? 'Chưa ghép'}
                  </span>
                  {correctRightId && rightId && (
                    <span
                      className={
                        rightId === correctRightId
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }
                    >
                      {rightId === correctRightId
                        ? 'Đúng'
                        : `Đáp án: ${pair.rightText}`}
                    </span>
                  )}
                </div>
              );
            })}
            {question.explanation && (
              <p className="border-t pt-3 text-sm text-slate-600 dark:text-slate-300">
                Giải thích: {question.explanation}
              </p>
            )}
          </Card>
        );
      })}
    </main>
  );
}
