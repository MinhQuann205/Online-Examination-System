'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  readReportFilters,
  reportHref,
  reportApiQuery,
} from '@/lib/academic-navigation';
import type { AcademicSummary } from '@/lib/academic-report';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ResultError } from './results-ui';
export function AcademicSummaryCard({ summary }: { summary: AcademicSummary }) {
  const s = summary.scores;
  return (
    <Card className="results-report-card space-y-3">
      <h2 className="text-lg font-semibold">Tổng kết lượt làm đã hoàn tất</h2>
      <p>
        {summary.finalized} lượt · {summary.submitted} đã nộp ·{' '}
        {summary.expired} hết giờ
      </p>
      <p>
        {s.gradedAttempts} lượt có điểm hợp lệ. Mỗi lượt làm được tính riêng, kể
        cả nhiều lượt của cùng học viên và lịch sử người đã rời lớp. Không chọn
        điểm cao nhất hoặc điểm cuối.
      </p>
      {s.availability === 'AVAILABLE' ? (
        <dl className="admin-detail-grid">
          <div>
            <dt>Trung bình</dt>
            <dd>
              {s.average} / {s.scale}
            </dd>
          </div>
          <div>
            <dt>Thấp nhất</dt>
            <dd>
              {s.minimum} / {s.scale}
            </dd>
          </div>
          <div>
            <dt>Cao nhất</dt>
            <dd>
              {s.maximum} / {s.scale}
            </dd>
          </div>
        </dl>
      ) : (
        <p>
          {s.availability === 'MIXED_SCALES'
            ? 'Các lượt có thang điểm khác nhau: chưa tổng hợp điểm. Hãy lọc theo phiên bản hoặc bài giao.'
            : 'Chưa có điểm hợp lệ để tổng hợp.'}
        </p>
      )}
      <p className="muted">
        Điểm tổng kết làm tròn hai chữ số thập phân. Chỉ tính SUBMITTED/EXPIRED
        có điểm và tổng điểm lớn hơn 0; không thay thế điểm do máy chủ chấm. Số
        lượt không phải số học viên hoặc tỷ lệ hoàn thành.
      </p>
    </Card>
  );
}
export function AssignmentAcademicSummary({
  examId,
  assignmentId,
}: {
  examId: string;
  assignmentId: string;
}) {
  const f = readReportFilters({ reportAssignmentId: assignmentId });
  const q = useQuery({
    queryKey: ['academic-summary', examId, assignmentId],
    queryFn: () => api.examReportPage(examId, reportApiQuery(f, true)),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <section className="space-y-3" aria-label="Tổng kết điểm bài giao">
      <Button
        variant="outline"
        disabled={q.isFetching}
        onClick={() => void q.refetch()}
      >
        Làm mới tổng kết điểm
      </Button>
      {q.isPending ? (
        <p role="status">Đang tổng hợp điểm...</p>
      ) : q.isError ? (
        <ResultError error={q.error} retry={() => void q.refetch()} />
      ) : (
        <AcademicSummaryCard summary={q.data.summary} />
      )}
      <Link className="underline" href={reportHref('teacher', examId, f)}>
        Mở lịch sử lượt làm của bài giao
      </Link>
    </section>
  );
}
