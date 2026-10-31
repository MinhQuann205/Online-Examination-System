'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ExamAssignment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';

export function StudentExams() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  const client = useQueryClient();
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && session.data.role !== 'STUDENT')
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  const assignments = useQuery({
    queryKey: ['exam-assignments', 'student', page, search],
    queryFn: () =>
      api.examAssignments(`page=${page}&search=${encodeURIComponent(search)}`),
    enabled: session.data?.role === 'STUDENT',
  });
  const start = useMutation({
    mutationFn: api.startAttempt,
    onSuccess: async (attempt) => {
      await client.invalidateQueries({ queryKey: ['exam-assignments'] });
      router.push(`/student/attempts/${attempt.id}`);
    },
  });
  const [now, setNow] = useState(0);
  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  if (session.isPending || !session.data)
    return <main className="p-8 text-slate-500">Đang tải bài kiểm tra...</main>;
  const items = assignments.data?.items ?? [];
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Học viên</p>
        <h1 className="mt-1 text-3xl font-bold">Bài kiểm tra được giao</h1>
        <p className="mt-2 text-slate-500">
          Bài làm được lưu tự động trên máy chủ.
        </p>
      </div>
      <Input
        aria-label="Tìm kiếm"
        placeholder="Tìm kiếm..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {assignments.isError && (
        <Card className="p-5 text-sm text-red-600" role="alert">
          {assignments.error.message}
        </Card>
      )}
      {assignments.isPending && (
        <p role="status">Đang tải danh sách bài kiểm tra...</p>
      )}
      {start.error && (
        <Card className="p-5 text-sm text-red-600" role="alert">
          {start.error.message}
        </Card>
      )}
      {items.map((assignment: ExamAssignment) => {
        const attempts = assignment.attempts ?? [];
        const active = attempts.find(
          (attempt) => attempt.status === 'IN_PROGRESS',
        );
        const last = attempts[0];
        const opensAt = assignment.opensAt
          ? new Date(assignment.opensAt).getTime()
          : 0;
        const closesAt = assignment.closesAt
          ? new Date(assignment.closesAt).getTime()
          : Infinity;
        const notOpen = now < opensAt;
        const closed = now >= closesAt;
        const remaining = Math.max(0, assignment.maxAttempts - attempts.length);
        return (
          <Card key={assignment.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {assignment.exam.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {assignment.exam.durationMin} phút ·{' '}
                  {assignment.class?.name ?? 'Bài giao cá nhân'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mở:{' '}
                  {assignment.opensAt
                    ? new Date(assignment.opensAt).toLocaleString('vi-VN')
                    : 'Bất kỳ lúc nào'}
                  {' · '}Hạn:{' '}
                  {assignment.closesAt
                    ? new Date(assignment.closesAt).toLocaleString('vi-VN')
                    : 'Không giới hạn'}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">
                  {active
                    ? 'Đang làm'
                    : last?.status === 'SUBMITTED'
                      ? 'Đã nộp'
                      : last?.status === 'EXPIRED'
                        ? 'Hết giờ'
                        : notOpen
                          ? 'Chưa mở'
                          : closed
                            ? 'Đã đóng'
                            : 'Sẵn sàng'}
                </p>
                <p className="mt-1 text-slate-500">Còn {remaining} lượt</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {active ? (
                <Link href={`/student/attempts/${active.id}`}>
                  <Button type="button">Tiếp tục làm bài</Button>
                </Link>
              ) : !notOpen && !closed && remaining > 0 ? (
                <Button
                  type="button"
                  disabled={start.isPending}
                  onClick={() => start.mutate(assignment.id)}
                >
                  {start.isPending ? 'Đang bắt đầu...' : 'Bắt đầu làm bài'}
                </Button>
              ) : null}
              {last && last.status !== 'IN_PROGRESS' && (
                <Link href={`/student/results/${last.id}`}>
                  <Button type="button" variant="outline">
                    Xem kết quả
                  </Button>
                </Link>
              )}
              <Link
                href="/student/results"
                className="text-sm text-blue-700 hover:underline"
              >
                Lịch sử kết quả
              </Link>
            </div>
          </Card>
        );
      })}
      {!assignments.isPending && items.length === 0 && (
        <Card className="p-6 text-sm text-slate-500">
          Chưa có bài kiểm tra được giao.
        </Card>
      )}
      {assignments.data && (
        <Pagination
          page={page}
          total={assignments.data.total}
          pageCount={assignments.data.pageCount}
          onPage={setPage}
          busy={assignments.isFetching}
        />
      )}
    </main>
  );
}
