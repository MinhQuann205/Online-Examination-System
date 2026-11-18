'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  readReportFilters,
  reportApiQuery,
  reportHref,
  reportAttemptHref,
  type ReportFilters,
} from '@/lib/academic-navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import { AcademicSummaryCard } from './academic-summary';
import {
  ResultError,
  ResultStatus,
  ResultsHeading,
  resultDate,
  useResultActor,
  type ResultRole,
} from './results-ui';
export function HistoricalExamReport({
  examId,
  role = 'TEACHER',
  initialFilters = readReportFilters({}),
}: {
  examId: string;
  role?: Extract<ResultRole, 'ADMIN' | 'TEACHER'>;
  initialFilters?: ReportFilters;
}) {
  const { session, allowed, user } = useResultActor(role),
    [f, setFilters] = useState(initialFilters),
    pathRole = role === 'ADMIN' ? 'admin' : 'teacher';
  const q = useQuery({
    queryKey: ['academic-report', role, user?.id, examId, f],
    queryFn: () => api.examReportPage(examId, reportApiQuery(f)),
    enabled: allowed && !f.invalid,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  function update(patch: Partial<ReportFilters>) {
    const next = { ...f, ...patch };
    setFilters(next);
    window.history.replaceState(null, '', reportHref(pathRole, examId, next));
  }
  if (session.isError)
    return (
      <ResultError error={session.error} retry={() => void session.refetch()} />
    );
  if (!allowed) return <p role="status">Đang xác thực phiên...</p>;
  return (
    <div className="results-page">
      <ResultsHeading
        title={q.isSuccess ? q.data.exam.title : 'Báo cáo lịch sử'}
        description="Lượt làm đã hoàn tất trong phạm vi quản lý. Lượt đang làm và người chưa tham gia nằm ở tiến độ bài giao."
      >
        <Button
          variant="outline"
          disabled={q.isFetching || f.invalid}
          onClick={() => void q.refetch()}
        >
          Làm mới báo cáo
        </Button>
      </ResultsHeading>
      <Card className="results-report-card space-y-3">
        <div className="admin-toolbar">
          <label>
            Tìm học viên
            <Input
              value={f.search}
              maxLength={200}
              placeholder="Họ tên hoặc email"
              onChange={(e) => update({ search: e.target.value, page: 1 })}
            />
          </label>
          <label>
            Trạng thái lượt
            <select
              value={f.status}
              onChange={(e) =>
                update({
                  status: e.target.value as ReportFilters['status'],
                  page: 1,
                })
              }
            >
              <option value="all">Tất cả đã hoàn tất</option>
              <option value="SUBMITTED">Đã nộp</option>
              <option value="EXPIRED">Hết giờ</option>
            </select>
          </label>
          <label>
            Số dòng mỗi trang
            <select
              value={f.limit}
              onChange={(e) =>
                update({ limit: Number(e.target.value), page: 1 })
              }
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {f.assignmentId && (
          <p>
            Bài giao: {f.assignmentId}{' '}
            <Button
              variant="outline"
              onClick={() => update({ assignmentId: '', page: 1 })}
            >
              Bỏ lọc bài giao
            </Button>
          </p>
        )}
        {f.versionId && (
          <p>
            Phiên bản: {f.versionId}{' '}
            <Button
              variant="outline"
              onClick={() => update({ versionId: '', page: 1 })}
            >
              Bỏ lọc phiên bản
            </Button>
          </p>
        )}
        {f.invalid && (
          <p role="alert">
            Liên kết bộ lọc không hợp lệ.{' '}
            <Button onClick={() => update({ ...readReportFilters({}) })}>
              Xóa bộ lọc
            </Button>
          </p>
        )}
      </Card>
      {!f.invalid &&
        (q.isPending ? (
          <p role="status">Đang tải lịch sử...</p>
        ) : q.isError ? (
          <ResultError error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <AcademicSummaryCard summary={q.data.summary} />
            {!q.data.items.length ? (
              <Card className="results-report-card">
                <p>
                  Không có lượt hoàn tất phù hợp. Thử bỏ bộ lọc hoặc xem tiến độ
                  bài giao.
                </p>
              </Card>
            ) : (
              <div className="results-exam-list">
                {q.data.items.map((row) => (
                  <Card className="results-exam-row" key={row.id}>
                    <div className="min-w-0 space-y-2">
                      <h2>{row.student.fullName}</h2>
                      <p className="break-words">
                        {row.student.email}
                        {!row.student.isActive
                          ? ' · Tài khoản ngừng hoạt động'
                          : ''}
                      </p>
                      <p>
                        {row.exam.title} · v{row.examVersion} ·{' '}
                        {row.class?.name ?? 'Giao cá nhân'}
                      </p>
                      <ResultStatus status={row.status} />
                      <p>
                        Điểm:{' '}
                        {row.score === null
                          ? 'Chưa có điểm'
                          : row.score + ' / ' + (row.maxScore ?? '—')}
                      </p>
                      <p>
                        Bắt đầu {resultDate(row.startedAt)} · Hoàn tất{' '}
                        {resultDate(row.submittedAt)}
                      </p>
                      <Link
                        className="underline"
                        href={reportHref(pathRole, examId, {
                          ...f,
                          assignmentId: row.assignmentId,
                          page: 1,
                        })}
                      >
                        Lọc bài giao này
                      </Link>
                      {row.examVersionId && (
                        <>
                          {' · '}
                          <Link
                            className="underline"
                            href={reportHref(pathRole, examId, {
                              ...f,
                              versionId: row.examVersionId ?? '',
                              page: 1,
                            })}
                          >
                            Lọc phiên bản này
                          </Link>
                        </>
                      )}
                      {role === 'TEACHER' && (
                        <p>
                          <Link
                            className="underline"
                            href={'/teacher/assignments/' + row.assignmentId}
                          >
                            Tiến độ / người nhận bài giao
                          </Link>
                        </p>
                      )}
                    </div>
                    <Link
                      className="results-exam-link"
                      href={reportAttemptHref(pathRole, examId, row.id, {
                        ...f,
                        page: q.data.page,
                      })}
                    >
                      Xem kết quả
                    </Link>
                  </Card>
                ))}
              </div>
            )}
            <Pagination
              page={q.data.page}
              total={q.data.total}
              pageCount={q.data.pageCount}
              busy={q.isFetching}
              onPage={(page) => update({ page })}
            />
          </>
        ))}
    </div>
  );
}
