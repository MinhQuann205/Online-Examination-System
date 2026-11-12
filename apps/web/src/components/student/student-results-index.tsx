'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, LockKeyhole, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import {
  StudentHeading,
  StatusBadge,
  EmptyState,
  ErrorState,
  useStudentSessionError,
  displayDate,
} from './student-ui';
type Summary = {
  id: string;
  exam: {
    id: string;
    title: string;
    durationMin: number | null;
    metadataAvailable: boolean;
  };
  status: 'SUBMITTED' | 'EXPIRED';
  submittedAt: string | null;
  startedAt: string;
  score: string | null;
  maxScore: string | null;
};
export function StudentResultsIndex() {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['student-results', page],
    queryFn: () => api.studentResultsPage(page),
    staleTime: 0,
    gcTime: 0,
  });
  useStudentSessionError(q.error);
  const items = (q.data?.items ?? []) as Summary[];
  return (
    <div className="student-page">
      <StudentHeading
        title="Lịch sử kết quả"
        description="Các lượt làm đã hoàn tất của bạn. Điểm và đáp án được công bố theo từng bài giao."
      >
        <Link className="admin-secondary-link" href="/student/exams">
          Bài thi được giao
        </Link>
      </StudentHeading>
      <Card className="student-results-intro">
        <BarChart3 size={40} aria-hidden="true" />
        <div>
          <p className="eyebrow">KẾT QUẢ CỦA TÔI</p>
          <h2>Xem lại từng bước đã hoàn thành</h2>
          <p>
            Tiêu đề và thời lượng theo bản đề khi làm bài. Điểm chưa công bố
            được giữ ẩn; đáp án có chính sách công bố riêng.
          </p>
        </div>
      </Card>
      <Card className="student-panel">
        <div className="student-section-heading">
          <h2>Bài làm đã hoàn tất</h2>
          <Button variant="outline" onClick={() => void q.refetch()}>
            Làm mới
          </Button>
        </div>
        {q.isError ? (
          <ErrorState error={q.error} retry={() => void q.refetch()} />
        ) : q.isPending ? (
          <p role="status">Đang tải kết quả...</p>
        ) : (
          <>
            <p className="muted">{q.data.total} lượt làm · Mới nhất trước</p>
            <div className="student-collection">
              {items.map((item) => (
                <article
                  className="student-result-card"
                  key={item.id}
                  data-result-id={item.id}
                >
                  <div>
                    <StatusBadge
                      tone={item.status === 'SUBMITTED' ? 'success' : 'neutral'}
                    >
                      {item.status === 'EXPIRED' ? 'Hết giờ' : 'Đã nộp'}
                    </StatusBadge>
                    <h2>{item.exam.title}</h2>
                    <p className="muted">
                      Thời lượng bản đề:{' '}
                      {item.exam.durationMin === null
                        ? 'Chưa khả dụng'
                        : item.exam.durationMin + ' phút'}
                    </p>
                    <p className="muted">
                      Bắt đầu: {displayDate(item.startedAt)}
                      <br />
                      Hoàn tất:{' '}
                      {item.submittedAt
                        ? displayDate(item.submittedAt)
                        : 'Chưa có thời điểm'}
                    </p>
                  </div>
                  <div className="student-result-score">
                    {item.score === null ? (
                      <p className="student-score-hidden">
                        <LockKeyhole size={20} aria-hidden="true" />
                        Điểm chưa được công bố
                      </p>
                    ) : (
                      <p>
                        <strong>{item.score}</strong> / {item.maxScore ?? '—'}
                      </p>
                    )}
                    <Link
                      className="admin-secondary-link"
                      href={'/student/results/' + item.id}
                    >
                      Xem bài làm <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {!items.length && (
              <EmptyState title="Chưa có kết quả hoàn thành." />
            )}
            <Pagination
              page={page}
              total={q.data.total}
              pageCount={q.data.pageCount}
              busy={q.isFetching}
              onPage={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
