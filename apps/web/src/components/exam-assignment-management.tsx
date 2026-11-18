'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ExamAssignment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AssignmentCreationForm } from './assignment-creation-form';
import { RemoteAssignmentSelect } from './remote-assignment-select';
import { assignmentWindow } from '@/lib/assignment-form';
import type { RemoteChoice } from '@/lib/examination-operations';
import { ErrorState, useTeacherAction } from '@/components/teacher/teacher-ui';
import { Pagination } from '@/components/pagination';
import {
  readAssignmentListFilters,
  assignmentListHref,
  assignmentDetailHref,
  readReportFilters,
  reportHref,
  assignmentListApiQuery,
  type AssignmentListFilters,
} from '@/lib/academic-navigation';
import type { AssignmentIntent } from '@/lib/assignment-intent';

function useTeacherSession() {
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && !['TEACHER', 'ADMIN'].includes(session.data.role))
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  return session;
}

function localDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

export function ExamAssignmentManagement({
  initialSelection = {},
  initialListFilters = readAssignmentListFilters({}),
}: {
  initialSelection?: AssignmentIntent;
  initialListFilters?: AssignmentListFilters;
}) {
  const session = useTeacherSession();
  const [filterClass, setFilterClass] = useState<RemoteChoice | null>(null);
  const [listFilters, setListFilters] = useState(initialListFilters);
  const { page, search } = listFilters;
  function updateList(patch: Partial<AssignmentListFilters>) {
    const next = { ...listFilters, ...patch };
    setListFilters(next);
    const href = assignmentListHref(next);
    window.history.replaceState(null, '', href);
  }
  const setPage = (page: number) => updateList({ page });
  const assignments = useQuery({
    queryKey: ['exam-assignments', 'management', listFilters],
    queryFn: () =>
      api.examAssignments(
        assignmentListApiQuery(listFilters) + '&operations=true',
      ),
    enabled:
      !listFilters.invalid &&
      ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
  });
  if (session.isPending || !session.data)
    return <div className="p-8 text-slate-500">Đang tải...</div>;
  const assignmentItems =
    listFilters.invalid || assignments.isError
      ? []
      : (assignments.data?.items ?? []);

  return (
    <div className="teacher-page">
      <div>
        <p className="text-sm font-semibold text-blue-600">Giảng viên</p>
        <h1 className="mt-1 text-3xl font-bold">Giao bài kiểm tra</h1>
        <p className="mt-2 text-slate-500">
          Chọn đề đã xuất bản, người nhận và thời gian làm bài.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label>
          Loại người nhận
          <select
            value={listFilters.recipient}
            onChange={(e) =>
              updateList({
                recipient: e.target.value as AssignmentListFilters['recipient'],
                classId:
                  e.target.value === 'student' ? '' : listFilters.classId,
                page: 1,
              })
            }
          >
            <option value="all">Tất cả</option>
            <option value="class">Theo lớp</option>
            <option value="student">Cá nhân</option>
          </select>
        </label>
        <label>
          Lịch giao
          <select
            value={listFilters.window}
            onChange={(e) =>
              updateList({
                window: e.target.value as AssignmentListFilters['window'],
                page: 1,
              })
            }
          >
            <option value="all">Tất cả lịch</option>
            <option value="upcoming">Chưa mở</option>
            <option value="open">Trong lịch mở</option>
            <option value="closed">Đã đóng</option>
          </select>
        </label>
        <RemoteAssignmentSelect
          kind="classes"
          value={
            listFilters.classId
              ? filterClass?.id === listFilters.classId
                ? filterClass
                : { id: listFilters.classId, label: 'Lớp từ liên kết' }
              : null
          }
          enabled={listFilters.recipient !== 'student'}
          onChange={(x) => {
            setFilterClass(x);
            updateList({ classId: x?.id ?? '', page: 1 });
          }}
        />
        <Button
          variant="outline"
          onClick={() => updateList(readAssignmentListFilters({}))}
        >
          Xóa bộ lọc danh sách
        </Button>
      </div>
      <p className="muted">
        Lịch mở chỉ mô tả thời gian giao, không thay thế điều kiện bắt đầu của
        học viên. Bộ lọc danh sách độc lập với biểu mẫu tạo bài giao.
      </p>
      {listFilters.examId && (
        <p>
          Đang lọc đề từ liên kết.{' '}
          <Button
            variant="outline"
            onClick={() => updateList({ examId: '', versionId: '', page: 1 })}
          >
            Bỏ lọc đề
          </Button>
        </p>
      )}
      {listFilters.versionId && (
        <p>
          Đang lọc đúng phiên bản đã pin.{' '}
          <Button
            variant="outline"
            onClick={() => updateList({ versionId: '', page: 1 })}
          >
            Bỏ lọc phiên bản
          </Button>
        </p>
      )}
      {listFilters.invalid && (
        <p role="alert">
          Liên kết bộ lọc không hợp lệ; hãy xóa bộ lọc trước khi tải danh sách.
        </p>
      )}
      <Input
        aria-label="Tìm kiếm"
        placeholder="Tìm kiếm..."
        value={search}
        onChange={(event) => {
          updateList({ search: event.target.value, page: 1 });
        }}
      />
      <AssignmentCreationForm
        initialSelection={initialSelection}
        allowed={['TEACHER', 'ADMIN'].includes(session.data.role)}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Điều hành bài đã giao</h2>
        {assignments.data?.operations && !assignments.isError && (
          <Card className="p-4 space-y-3">
            <h3>Tổng quan lịch của toàn bộ bộ lọc hiện tại</h3>
            <p>
              {assignments.data.operations.upcoming} chưa mở ·{' '}
              {assignments.data.operations.open} trong lịch mở ·{' '}
              {assignments.data.operations.closed} đã đóng
            </p>
            <p className="muted">
              Đếm bài giao, không phải số học viên hay tỷ lệ hoàn thành. Lịch
              tính theo máy chủ tại lần tải; quyền thi vẫn được kiểm tra khi bắt
              đầu.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                ['upcoming', 'Chuẩn bị bài sắp mở'],
                ['open', 'Theo dõi bài đang mở'],
                ['closed', 'Đối chiếu bài đã đóng'],
              ].map(([window, label]) => (
                <Button
                  key={window}
                  variant="outline"
                  onClick={() =>
                    updateList({
                      window: window as AssignmentListFilters['window'],
                      page: 1,
                    })
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        )}
        {!listFilters.invalid && assignments.isPending && (
          <p role="status">Đang tải danh sách bài giao...</p>
        )}
        {assignments.isError && (
          <ErrorState
            error={assignments.error}
            retry={() => void assignments.refetch()}
          />
        )}
        {assignmentItems.map((item: ExamAssignment) => (
          <Card
            key={item.id}
            data-assignment-id={item.id}
            className="p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.exam.title}</h3>
                <p>
                  {assignmentWindow(
                    item.opensAt,
                    item.closesAt,
                    Date.parse(assignments.data?.serverNow ?? ''),
                  )}{' '}
                  · lịch tại lần tải gần nhất
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.class?.name ?? item.student?.fullName ?? 'Người nhận'}
                  {' · '}Phiên bản {item.examVersion?.number ?? '—'}
                  {' · '}
                  {item._count.attempts} lượt đã bắt đầu ·{' '}
                  {item.exam.durationMin ?? '—'} phút
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mở: {localDateTime(item.opensAt)} · Đóng:{' '}
                  {localDateTime(item.closesAt)} · Tối đa {item.maxAttempts}{' '}
                  lượt
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={assignmentDetailHref(item.id, listFilters)}
                  className="admin-secondary-link"
                >
                  Chi tiết / tiến độ
                </Link>
                <Link
                  className="admin-secondary-link"
                  href={
                    assignmentDetailHref(item.id, listFilters) +
                    '#assignment-recipients'
                  }
                >
                  Học viên
                </Link>
                <Link
                  className="admin-secondary-link"
                  href={
                    assignmentDetailHref(item.id, listFilters) +
                    (assignmentDetailHref(item.id, listFilters).includes('?')
                      ? '&'
                      : '?') +
                    'recipientStatus=not_started#assignment-recipients'
                  }
                >
                  Theo dõi người chưa bắt đầu
                </Link>
                <Link
                  href={reportHref(
                    'teacher',
                    item.examId,
                    readReportFilters({ reportAssignmentId: item.id }),
                  )}
                >
                  <Button type="button" variant="outline">
                    Kết quả
                  </Button>
                </Link>
              </div>
            </div>
            {'createdById' in item && item.createdById === session.data.id && (
              <AssignmentSchedule item={item} />
            )}
          </Card>
        ))}
        {!listFilters.invalid &&
          !assignments.isPending &&
          !assignments.isError &&
          assignmentItems.length === 0 && (
            <Card className="p-6 text-sm text-slate-500">
              Không có bài giao phù hợp. Hãy thử đổi hoặc xóa bộ lọc danh sách.
            </Card>
          )}
        {assignments.data && !assignments.isError && (
          <Pagination
            page={page}
            total={assignments.data.total}
            pageCount={assignments.data.pageCount}
            onPage={setPage}
            busy={assignments.isFetching}
          />
        )}
      </section>
    </div>
  );
}

export function AssignmentSchedule({ item }: { item: ExamAssignment }) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false),
    [notice, setNotice] = useState('');
  const action = useTeacherAction();
  const toLocal = (s: string | null) =>
    s
      ? new Date(
          new Date(s).getTime() - new Date(s).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : '';
  const [opens, setOpens] = useState(toLocal(item.opensAt)),
    [closes, setCloses] = useState(toLocal(item.closesAt)),
    [max, setMax] = useState(String(item.maxAttempts)),
    [score, setScore] = useState(item.showScore),
    [answers, setAnswers] = useState(item.showAnswers);
  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          setEditing(!editing);
          setNotice('');
          setOpens(toLocal(item.opensAt));
          setCloses(toLocal(item.closesAt));
          setMax(String(item.maxAttempts));
          setScore(item.showScore);
          setAnswers(item.showAnswers);
        }}
      >
        {editing ? 'Hủy chỉnh lịch' : 'Chỉnh lịch / công bố'}
      </Button>
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      {editing && (
        <form
          aria-label="Chỉnh lịch bài giao"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api.updateExamAssignment(item.id, {
                // A minute-resolution control must not change unedited server timestamps.
                opensAt:
                  opens === toLocal(item.opensAt)
                    ? item.opensAt
                    : opens
                      ? new Date(opens).toISOString()
                      : null,
                closesAt:
                  closes === toLocal(item.closesAt)
                    ? item.closesAt
                    : closes
                      ? new Date(closes).toISOString()
                      : null,
                maxAttempts: Number(max),
                showScore: score,
                showAnswers: answers,
              });
              setEditing(false);
              setNotice('Đã cập nhật bài giao.');
              await Promise.all([
                cache.invalidateQueries({ queryKey: ['exam-assignments'] }),
                cache.invalidateQueries({
                  queryKey: ['teacher-assignment', item.id],
                }),
                cache.invalidateQueries({
                  queryKey: ['student-assignment', item.id],
                }),
              ]);
            });
          }}
        >
          <fieldset
            disabled={action.pending}
            className="teacher-form-grid mt-4"
          >
            <label>
              Mở bài mới
              <Input
                aria-label="Mở bài mới"
                type="datetime-local"
                value={opens}
                onChange={(e) => setOpens(e.target.value)}
              />
            </label>
            <label>
              Đóng bài mới
              <Input
                aria-label="Đóng bài mới"
                type="datetime-local"
                value={closes}
                onChange={(e) => setCloses(e.target.value)}
              />
            </label>
            <label>
              Số lượt mới
              <Input
                type="number"
                min={1}
                max={20}
                required
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </label>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={score}
                  onChange={(e) => setScore(e.target.checked)}
                />
                Công bố điểm
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={answers}
                  onChange={(e) => setAnswers(e.target.checked)}
                />
                Công bố đáp án
              </label>
            </div>
            <p className="muted">
              Không thể đổi giờ mở/đóng khi còn lượt IN_PROGRESS. Lỗi 409 giữ
              nguyên lịch trên máy chủ.
            </p>
            <Button type="submit" disabled={action.pending}>
              Lưu lịch
            </Button>
          </fieldset>
          {action.error && <ErrorState error={action.error} />}
        </form>
      )}
    </div>
  );
}
