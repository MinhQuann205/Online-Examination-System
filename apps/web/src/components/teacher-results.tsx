'use client';
import Link from 'next/link';
import { HistoricalExamReport } from './results/exam-report';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import { EmptyState, StatusBadge } from '@/components/admin/admin-ui';
import {
  ResultError,
  ResultsHeading,
  stateLabel,
  useResultActor,
  type ResultRole,
} from './results/results-ui';
type ExamOption = {
  id: string;
  title: string;
  status: string;
  _count: { assignments: number; attempts: number };
};
export function TeacherResultsIndex() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('');
  const { session, allowed, user } = useResultActor('TEACHER');
  const q = useQuery({
    queryKey: ['exams', 'results', user?.id, page, search, status],
    queryFn: async () =>
      (await api.exams(
        new URLSearchParams({
          results: 'true',
          page: String(page),
          search,
          ...(status ? { status } : {}),
        }).toString(),
      )) as unknown as {
        items: ExamOption[];
        total: number;
        pageCount: number;
      },
    enabled: allowed,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  if (session.isError)
    return (
      <ResultError error={session.error} retry={() => void session.refetch()} />
    );
  if (!allowed) return <p role="status">Đang xác thực phiên...</p>;
  return (
    <div className="results-page">
      <ResultsHeading
        title="Kết quả thi"
        description="Tra cứu đề thi và mở báo cáo trong phạm vi bạn được quản lý."
      >
        <Button
          type="button"
          variant="outline"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          Làm mới danh sách
        </Button>
      </ResultsHeading>
      <Card className="results-report-card">
        <div className="admin-toolbar">
          <label>
            Tìm kiếm
            <Input
              aria-label="Tìm kiếm"
              placeholder="Tìm kiếm..."
              maxLength={200}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Trạng thái đề
            <select
              aria-label="Trạng thái đề"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {q.isPending ? (
          <p role="status">Đang tải danh sách kết quả...</p>
        ) : q.isError ? (
          <ResultError error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <p className="muted">
              {q.data.total} đề phù hợp. Số lượt làm được API trả theo đề; nội
              dung báo cáo vẫn tuân theo quyền lớp và bài giao.
            </p>
            <div className="results-exam-list">
              {q.data.items.map((exam) => (
                <Card className="results-exam-row" key={exam.id}>
                  <div>
                    <StatusBadge
                      tone={exam.status === 'PUBLISHED' ? 'success' : 'neutral'}
                    >
                      {stateLabel(exam.status)}
                    </StatusBadge>
                    <h2>{exam.title}</h2>
                    <p>
                      {exam._count.assignments} bài giao ·{' '}
                      {exam._count.attempts} lượt làm của đề
                    </p>
                  </div>
                  <Link
                    className="results-exam-link"
                    href={`/teacher/exams/${exam.id}/results`}
                  >
                    Xem kết quả <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                </Card>
              ))}
            </div>
            {!q.data.items.length && (
              <EmptyState title="Chưa có đề thi.">
                Thử đổi từ khóa hoặc bộ lọc. Không có bài làm giả được tạo cho
                đề nháp.
              </EmptyState>
            )}
            <Pagination
              page={page}
              total={q.data.total}
              pageCount={q.data.pageCount}
              onPage={setPage}
              busy={q.isFetching}
            />
          </>
        )}
      </Card>
    </div>
  );
}
export function TeacherExamResults({
  examId,
  role = 'TEACHER',
  initialFilters,
}: {
  examId: string;
  role?: Extract<ResultRole, 'ADMIN' | 'TEACHER'>;
  initialFilters?: import('@/lib/academic-navigation').ReportFilters;
}) {
  return (
    <HistoricalExamReport
      examId={examId}
      role={role}
      initialFilters={initialFilters}
    />
  );
}
