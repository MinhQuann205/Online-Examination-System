'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';

type Exam = {
  id: string;
  title: string;
  status: string;
  version: number;
  _count: { assignments: number; attempts: number };
};

export function AdminExamMonitor() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && session.data.role !== 'ADMIN')
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  const exams = useQuery({
    queryKey: ['admin-exams', page, search],
    queryFn: () =>
      api.exams(`page=${page}&search=${encodeURIComponent(search)}`),
    enabled: session.data?.role === 'ADMIN',
  });
  if (session.isPending || !session.data)
    return (
      <main className="p-8 text-slate-500">Đang tải tình trạng bài thi...</main>
    );
  const rows = (exams.data?.items ?? []) as Exam[];
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Quản trị viên</p>
        <h1 className="mt-1 text-3xl font-bold">Theo dõi bài thi</h1>
        <p className="mt-2 text-slate-500">
          Tình trạng phát hành, giao bài và lượt làm.
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
      {exams.error && (
        <p role="alert" className="text-sm text-red-600">
          {exams.error?.message}
        </p>
      )}
      {exams.isPending && <p role="status">Đang tải danh sách bài thi...</p>}
      {rows.map((exam) => {
        return (
          <Card
            key={exam.id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <h2 className="font-semibold">{exam.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {exam.status} · Phiên bản {exam.version} ·{' '}
                {exam._count.assignments} bài giao · {exam._count.attempts} lượt
                làm
              </p>
            </div>
            <Link href={`/teacher/exams/${exam.id}/results`}>
              <Button type="button" variant="outline">
                Theo dõi kết quả
              </Button>
            </Link>
          </Card>
        );
      })}
      {!exams.isPending && rows.length === 0 && (
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
