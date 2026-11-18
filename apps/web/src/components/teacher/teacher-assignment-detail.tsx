'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import {
  readRecipientFilters,
  recipientHref,
  type RecipientFilters,
} from '@/lib/management-page-state';
import { api } from '@/lib/api';
import { assignmentWindow, finalAttemptScore } from '@/lib/assignment-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import { AssignmentAcademicSummary } from '../results/academic-summary';
import { AssignmentProgress } from './assignment-progress';
import { AssignmentSchedule } from '@/components/exam-assignment-management';
import {
  DataTable,
  EmptyState,
  ErrorState,
  StatusBadge,
  TeacherHeading,
} from './teacher-ui';

const date = (s: string | null) =>
  s ? new Date(s).toLocaleString('vi-VN') : 'Không giới hạn';
const statusLabels: Record<string, string> = {
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  EXPIRED: 'Hết giờ',
};
export function TeacherAssignmentDetail({
  assignmentId,
  initialFilters = readRecipientFilters({}),
  returnHref,
}: {
  initialFilters?: RecipientFilters;
  assignmentId: string;
  returnHref?: string;
}) {
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const allowed = me.data?.role === 'TEACHER';
  const detail = useQuery({
    queryKey: ['teacher-assignment', assignmentId],
    queryFn: () => api.examAssignment(assignmentId),
    enabled: allowed,
    staleTime: 0,
    gcTime: 0,
  });
  const [filters, setFilters] = useState(initialFilters);
  const { page, search, status: recipientStatus } = filters;
  function updateFilters(patch: Partial<RecipientFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    const target = recipientHref(assignmentId, next),
      context = returnHref?.split('?')[1];
    window.history.replaceState(
      null,
      '',
      target + (context ? (target.includes('?') ? '&' : '?') + context : ''),
    );
  }
  const [now, setNow] = useState(0);
  const students = useQuery({
    queryKey: ['assignment-recipients', assignmentId, filters],
    queryFn: () =>
      api.examAssignmentRecipients(
        assignmentId,
        new URLSearchParams({
          paged: 'true',
          search: filters.search,
          status: filters.status,
          page: String(filters.page),
          limit: String(filters.limit),
        }).toString(),
      ),
    enabled: allowed && detail.isSuccess && !detail.isError,
    staleTime: 0,
    gcTime: 0,
  });
  useEffect(() => {
    const tick = () => setNow(Date.now()),
      first = setTimeout(tick, 0),
      timer = setInterval(tick, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  if (me.isError)
    return <ErrorState error={me.error} retry={() => void me.refetch()} />;
  if (me.isPending) return <p role="status">Đang xác thực...</p>;
  if (!allowed)
    return (
      <p role="alert">
        Trang này dành cho giảng viên. Quyền truy cập được kiểm tra lại trên máy
        chủ.
      </p>
    );
  if (detail.isPending) return <p role="status">Đang tải bài đã giao...</p>;
  if (detail.isError)
    return (
      <div className="teacher-page">
        <TeacherHeading
          title="Chi tiết bài giao"
          description="Không thể tải bài giao trong phạm vi của bạn."
        />
        <ErrorState error={detail.error} retry={() => void detail.refetch()} />
      </div>
    );
  const item = detail.data,
    rows = students.isError ? [] : (students.data?.items ?? []),
    pageCount = students.data?.pageCount ?? 0,
    currentPage = students.data?.page ?? page;
  return (
    <div className="teacher-page" data-assignment-id={item.id}>
      <TeacherHeading
        title={item.exam.title}
        description="Bài đã giao và lịch sử lượt làm theo quyền truy cập hiện tại."
      />
      <Card className="teacher-panel">
        <StatusBadge>
          {assignmentWindow(item.opensAt, item.closesAt, now)}
        </StatusBadge>
        <dl className="admin-detail-grid">
          <div>
            <dt>Phiên bản đã pin</dt>
            <dd>
              {item.examVersion
                ? `v${item.examVersion.number}`
                : 'Không khả dụng'}
            </dd>
          </div>
          <div>
            <dt>Thời lượng</dt>
            <dd>
              {item.exam.durationMin === null
                ? 'Không khả dụng'
                : `${item.exam.durationMin} phút`}
            </dd>
          </div>
          <div>
            <dt>Người nhận</dt>
            <dd>
              {item.class
                ? `${item.class.name} · ${item.class.code}`
                : (item.student?.fullName ?? 'Không khả dụng')}
            </dd>
          </div>
          <div>
            <dt>Mở bài</dt>
            <dd>{date(item.opensAt)}</dd>
          </div>
          <div>
            <dt>Đóng bài</dt>
            <dd>{date(item.closesAt)}</dd>
          </div>
          <div>
            <dt>Số lượt tối đa / học viên</dt>
            <dd>{item.maxAttempts}</dd>
          </div>
          <div>
            <dt>Tổng lượt đã bắt đầu</dt>
            <dd>{item._count.attempts}</dd>
          </div>
        </dl>
        {item.exam.description && (
          <p className="whitespace-pre-wrap">{item.exam.description}</p>
        )}
        <p className="muted">
          {item.showScore
            ? 'Học viên được xem điểm khi hoàn tất.'
            : 'Điểm đang ẩn với học viên.'}{' '}
          {item.showAnswers
            ? 'Học viên được xem đáp án khi hoàn tất.'
            : 'Đáp án đang ẩn với học viên.'}
        </p>
        <div className="admin-row-actions">
          <Link
            className="admin-secondary-link"
            href={`/teacher/exams/${item.examId}`}
          >
            Xem đề và phiên bản
          </Link>
          <Link
            className="admin-secondary-link"
            href={`/teacher/exams/${item.examId}/results`}
          >
            Kết quả của đề thi
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={detail.isFetching || students.isFetching}
            onClick={() => {
              void detail.refetch();
              void students.refetch();
            }}
          >
            Làm mới bài giao
          </Button>
        </div>
        {item.createdById === me.data.id && <AssignmentSchedule item={item} />}
      </Card>
      <AssignmentProgress
        assignmentId={assignmentId}
        onSelect={(status) => updateFilters({ status, search: '', page: 1 })}
      />
      <AssignmentAcademicSummary examId={item.exam.id} assignmentId={item.id} />
      <Card className="teacher-panel">
        <h2 id="assignment-recipients" tabIndex={-1}>
          Người nhận hiện tại và các lượt làm
        </h2>
        <p className="muted">
          Danh sách lớp phản ánh thành viên đang hoạt động hiện tại. Lịch sử của
          thành viên đã rời lớp vẫn được giữ trong báo cáo kết quả của đề; không
          suy tổng lịch sử từ bảng này.
        </p>
        <div className="admin-toolbar">
          <label>
            Tìm người nhận
            <Input
              aria-label="Tìm người nhận"
              maxLength={150}
              value={search}
              onChange={(e) => {
                updateFilters({ search: e.target.value, page: 1 });
              }}
            />
          </label>
          <label>
            Tiến độ học viên
            <select
              aria-label="Lọc tiến độ học viên"
              value={recipientStatus}
              onChange={(e) => {
                updateFilters({ status: e.target.value, page: 1 });
              }}
            >
              <option value="all">Tất cả người nhận</option>
              <option value="not_started">Chưa bắt đầu</option>
              <option value="in_progress">Đang làm</option>
              <option value="completed">Đã hoàn tất</option>
            </select>
          </label>
        </div>
        <label>
          Số người nhận / trang
          <select
            aria-label="Số người nhận mỗi trang"
            value={filters.limit}
            onChange={(e) =>
              updateFilters({ limit: Number(e.target.value), page: 1 })
            }
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {students.isSuccess && !students.isError && (
          <p className="muted">
            {students.data.total} người phù hợp trong danh sách người nhận.
          </p>
        )}
        {students.isPending ? (
          <p role="status">Đang tải người nhận...</p>
        ) : students.isError ? (
          <ErrorState
            error={students.error}
            retry={() => void students.refetch()}
          />
        ) : !rows.length ? (
          <EmptyState title={'Không có người nhận phù hợp bộ lọc.'} />
        ) : (
          <>
            <DataTable label="Lượt làm của người nhận bài giao">
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Lượt làm</th>
                  <th>Trạng thái</th>
                  <th>Hoàn tất</th>
                  <th>Điểm</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap((student) =>
                  student.attempts.length
                    ? student.attempts.map((attempt, index) => (
                        <tr key={attempt.id}>
                          <td>
                            {student.fullName}
                            <span className="block text-xs muted">
                              {student.email}
                            </span>
                          </td>
                          <td>Lượt {student.attempts.length - index}</td>
                          <td>
                            {statusLabels[attempt.status] ?? attempt.status}
                          </td>
                          <td>
                            {attempt.submittedAt
                              ? date(attempt.submittedAt)
                              : 'Chưa hoàn tất'}
                          </td>
                          <td>{finalAttemptScore(attempt)}</td>
                          <td>
                            {attempt.status === 'SUBMITTED' ||
                            attempt.status === 'EXPIRED' ? (
                              <Link
                                className="admin-secondary-link"
                                href={`/teacher/results/${attempt.id}`}
                              >
                                Xem kết quả
                              </Link>
                            ) : (
                              'Đang làm bài'
                            )}
                          </td>
                        </tr>
                      ))
                    : [
                        <tr key={student.id}>
                          <td>
                            {student.fullName}
                            <span className="block text-xs muted">
                              {student.email}
                            </span>
                          </td>
                          <td>—</td>
                          <td>Chưa bắt đầu</td>
                          <td>—</td>
                          <td>—</td>
                          <td>Chưa có kết quả</td>
                        </tr>,
                      ],
                )}
              </tbody>
            </DataTable>
            <Pagination
              page={currentPage}
              total={students.data.total}
              pageCount={pageCount}
              onPage={(page) => updateFilters({ page })}
              busy={students.isFetching}
            />
          </>
        )}
      </Card>
      {returnHref && (
        <Link className="admin-secondary-link" href={returnHref}>
          Quay lại danh sách theo bộ lọc
        </Link>
      )}
    </div>
  );
}
