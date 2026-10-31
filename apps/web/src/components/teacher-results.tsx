'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';

type ExamOption = { id: string; title: string; status: string };
type AttemptSummary = {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: string | null;
  maxScore: string | null;
};
type Recipient = {
  id: string;
  fullName: string;
  email: string;
  attempts: AttemptSummary[];
  isCurrentRecipient: boolean;
  isActive: boolean;
};
type ExamResultData = {
  exam: { id: string; title: string };
  assignments: Array<{
    id: string;
    class: { id: string; name: string } | null;
    student: Recipient | null;
    opensAt: string | null;
    closesAt: string | null;
    maxAttempts: number;
    examVersion: { title: string; number: number | null };
    students: Recipient[];
  }>;
};

function useTeacher() {
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && !['TEACHER', 'ADMIN'].includes(session.data.role))
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  return session;
}

export function TeacherResultsIndex() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const session = useTeacher();
  const exams = useQuery({
    queryKey: ['exams', 'results', page, search],
    queryFn: () =>
      api.exams(
        `results=true&page=${page}&search=${encodeURIComponent(search)}`,
      ),
    enabled: ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
  });
  if (session.isPending || !session.data)
    return <main className="p-8 text-slate-500">Đang tải đề thi...</main>;
  const items = (exams.data?.items ?? []) as ExamOption[];
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Giảng viên</p>
        <h1 className="mt-1 text-3xl font-bold">Kết quả thi</h1>
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
      {exams.error && (
        <p role="alert" className="text-red-600">
          {exams.error.message}
        </p>
      )}
      {exams.isPending && <p role="status">Đang tải danh sách kết quả...</p>}
      {items.map((exam) => (
        <Card
          key={exam.id}
          className="flex flex-wrap items-center justify-between gap-4 p-5"
        >
          <div>
            <h2 className="font-semibold">{exam.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{exam.status}</p>
          </div>
          <Link href={`/teacher/exams/${exam.id}/results`}>
            <Button type="button" variant="outline">
              Xem kết quả
            </Button>
          </Link>
        </Card>
      ))}
      {!exams.isPending && items.length === 0 && (
        <Card className="p-6 text-sm text-slate-500">Chưa có đề thi.</Card>
      )}
      {exams.data && (
        <Pagination
          page={page}
          total={exams.data.total}
          pageCount={exams.data.pageCount}
          onPage={setPage}
          busy={exams.isFetching}
        />
      )}
    </main>
  );
}

export function TeacherExamResults({ examId }: { examId: string }) {
  const session = useTeacher();
  const query = useQuery({
    queryKey: ['exam-results', examId],
    queryFn: () => api.examResults(examId),
    enabled: ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
    retry: false,
  });
  if (session.isPending || query.isPending)
    return <main className="p-8 text-slate-500">Đang tải kết quả...</main>;
  if (query.isError)
    return (
      <main role="alert" className="p-8 text-red-600">
        {query.error.message}
      </main>
    );
  const data = query.data as unknown as ExamResultData;
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8">
      <Link
        href="/teacher/results"
        className="text-sm text-blue-700 hover:underline"
      >
        ← Kết quả thi
      </Link>
      <header>
        <p className="text-sm font-semibold text-blue-600">Báo cáo đề thi</p>
        <h1 className="mt-1 text-3xl font-bold">{data.exam.title}</h1>
        <p className="text-sm text-slate-500">
          Tên đề hiện tại; mỗi bài giao bên dưới giữ tên phiên bản đã xuất bản.
        </p>
      </header>
      {data.assignments.map((assignment) => (
        <Card key={assignment.id} className="space-y-3 p-5">
          <div>
            <p className="font-semibold">
              {assignment.examVersion.title} · Phiên bản{' '}
              {assignment.examVersion.number ?? 'không khả dụng'}
            </p>
            <h2 className="font-semibold">
              {assignment.class?.name ??
                assignment.student?.fullName ??
                'Bài giao'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tối đa {assignment.maxAttempts} lượt · Hạn:{' '}
              {assignment.closesAt
                ? new Date(assignment.closesAt).toLocaleString('vi-VN')
                : 'Không giới hạn'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Học viên</th>
                  <th>Trạng thái</th>
                  <th>Điểm</th>
                  <th>Thời điểm nộp</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assignment.students.map((student) => {
                  const latest = student.attempts[0];
                  return (
                    <tr key={student.id} className="border-t">
                      <td className="py-2">
                        {student.fullName}
                        {!student.isCurrentRecipient && (
                          <span className="block text-xs text-amber-700">
                            Học viên từng tham gia
                          </span>
                        )}
                        {!student.isActive && (
                          <span className="block text-xs text-slate-500">
                            Tài khoản đã khóa
                          </span>
                        )}
                        <span className="block text-xs text-slate-500">
                          {student.email}
                        </span>
                      </td>
                      <td>{latest?.status ?? 'Chưa bắt đầu'}</td>
                      <td>
                        {latest?.score === null || !latest
                          ? '—'
                          : `${latest.score} / ${latest.maxScore}`}
                      </td>
                      <td>
                        {latest?.submittedAt
                          ? new Date(latest.submittedAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                      <td>
                        {latest && latest.status !== 'IN_PROGRESS' && (
                          <Link
                            href={`/teacher/results/${latest.id}`}
                            className="text-blue-700 hover:underline"
                          >
                            Chi tiết
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {assignment.students.length === 0 && (
            <p className="text-sm text-slate-500">
              Chưa có học viên trong phạm vi giao bài.
            </p>
          )}
        </Card>
      ))}
      {data.assignments.length === 0 && (
        <Card className="p-6 text-sm text-slate-500">
          Đề thi chưa được giao.
        </Card>
      )}
    </main>
  );
}
