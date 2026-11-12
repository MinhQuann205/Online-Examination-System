'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, ClipboardList } from 'lucide-react';
import { api, type ExamAssignment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import {
  StudentHeading,
  SearchToolbar,
  StatusBadge,
  EmptyState,
  ErrorState,
  useStudentSessionError,
  displayDate,
} from './student/student-ui';
function availability(item: ExamAssignment, now: number) {
  if (!now) return 'Đang kiểm tra lịch';
  if (
    !item.examVersion ||
    !item.exam.metadataAvailable ||
    item.exam.status === 'ARCHIVED'
  )
    return 'Không còn khả dụng';
  if (item.opensAt && now < Date.parse(item.opensAt)) return 'Chưa đến giờ';
  if (item.closesAt && now >= Date.parse(item.closesAt)) return 'Đã đóng';
  if (item._count.attempts >= item.maxAttempts) return 'Đã hết lượt làm bài';
  return 'Đang mở';
}
export function StudentExams() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [now, setNow] = useState(0),
    [pending, setPending] = useState<string | null>(null),
    [error, setError] = useState<Error | null>(null),
    [denied, setDenied] = useState<string | null>(null);
  const busy = useRef(false),
    router = useRouter(),
    client = useQueryClient();
  const q = useQuery({
    queryKey: ['exam-assignments', 'student', page, search],
    queryFn: () =>
      api.examAssignments(
        new URLSearchParams({ page: String(page), search }).toString(),
      ),
    staleTime: 0,
    gcTime: 0,
  });
  useStudentSessionError(q.error || error);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0),
      timer = setInterval(tick, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  async function enter(item: ExamAssignment, attemptId?: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(item.id);
    setError(null);
    try {
      const attempt = attemptId
        ? await api.attempt(attemptId)
        : await api.startAttempt(item.id);
      void client.invalidateQueries({ queryKey: ['exam-assignments'] });
      router.push(
        attempt.status === 'IN_PROGRESS'
          ? '/student/attempts/' + attempt.id
          : '/student/results/' + attempt.id,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause : new Error('Không thể mở bài làm.'),
      );
      setDenied(item.id);
    } finally {
      busy.current = false;
      setPending(null);
    }
  }
  async function refresh() {
    setNow(Date.now());
    setError(null);
    setDenied(null);
    await q.refetch();
  }
  return (
    <div className="student-page">
      <StudentHeading
        title="Bài kiểm tra được giao"
        description="Kiểm tra lịch, phiên bản và số lượt còn lại. Hệ thống xác nhận điều kiện trước khi mở phòng thi."
      >
        <Link className="admin-secondary-link" href="/student/results">
          Lịch sử kết quả
        </Link>
      </StudentHeading>
      <Card className="student-panel">
        <SearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
            setError(null);
            setDenied(null);
          }}
        >
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => void refresh()}
          >
            Làm mới
          </Button>
        </SearchToolbar>
        {error && <ErrorState error={error} retry={() => void refresh()} />}
        {q.isError ? (
          <ErrorState error={q.error} retry={() => void refresh()} />
        ) : q.isPending ? (
          <p role="status">Đang tải danh sách...</p>
        ) : (
          <>
            <p className="muted">
              {q.data.total} bài giao · Thời gian hiển thị theo múi giờ trình
              duyệt.
            </p>
            <div className="student-collection">
              {q.data.items
                .filter((item) => item.id !== denied)
                .map((item) => {
                  const attempts = item.attempts ?? [],
                    active = attempts.find((a) => a.status === 'IN_PROGRESS'),
                    last = attempts.find((a) => a.status !== 'IN_PROGRESS'),
                    state = availability(item, now),
                    remaining = Math.max(
                      0,
                      item.maxAttempts - item._count.attempts,
                    );
                  return (
                    <article
                      className="student-exam-card"
                      data-assignment-id={item.id}
                      key={item.id}
                    >
                      <div className="student-section-heading">
                        <div>
                          <p className="eyebrow">
                            <ClipboardList size={16} aria-hidden="true" />{' '}
                            {item.examVersion
                              ? 'Phiên bản ' + item.examVersion.number
                              : 'Chưa có phiên bản'}
                          </p>
                          <h2>{item.exam.title}</h2>
                          <p className="muted">
                            {item.class
                              ? item.class.name + ' · ' + item.class.code
                              : 'Bài giao cá nhân'}
                          </p>
                        </div>
                        <StatusBadge
                          tone={state === 'Đang mở' ? 'success' : 'neutral'}
                        >
                          {state}
                        </StatusBadge>
                      </div>
                      <dl className="student-meta">
                        <div>
                          <dt>
                            <Clock size={16} aria-hidden="true" /> Thời lượng
                          </dt>
                          <dd>
                            {item.exam.durationMin === null
                              ? 'Chưa khả dụng'
                              : item.exam.durationMin + ' phút'}
                          </dd>
                        </div>
                        <div>
                          <dt>Mở lúc</dt>
                          <dd>{displayDate(item.opensAt)}</dd>
                        </div>
                        <div>
                          <dt>Đóng lúc</dt>
                          <dd>{displayDate(item.closesAt)}</dd>
                        </div>
                        <div>
                          <dt>Lượt làm của bạn</dt>
                          <dd>
                            {item._count.attempts} / {item.maxAttempts} · Còn{' '}
                            {remaining} lượt
                          </dd>
                        </div>
                      </dl>
                      <div className="student-exam-footer">
                        <div>
                          {active ? (
                            <StatusBadge tone="primary">
                              Có bài đang làm dở
                            </StatusBadge>
                          ) : last ? (
                            <StatusBadge>
                              {last.status === 'SUBMITTED'
                                ? 'Đã nộp'
                                : 'Hết giờ'}
                            </StatusBadge>
                          ) : (
                            <span className="muted">Chưa có lượt làm</span>
                          )}
                          <p className="muted">
                            {item.showScore
                              ? 'Điểm được công bố'
                              : 'Điểm chưa được công bố'}{' '}
                            ·{' '}
                            {item.showAnswers
                              ? 'Cho xem đáp án sau khi hoàn tất'
                              : 'Chưa công bố đáp án'}
                          </p>
                        </div>
                        <div className="admin-row-actions">
                          {active ? (
                            <Button
                              disabled={pending !== null}
                              onClick={() => void enter(item, active.id)}
                            >
                              {pending === item.id
                                ? 'Đang mở bài...'
                                : 'Tiếp tục làm bài'}
                            </Button>
                          ) : state === 'Đang mở' ? (
                            <Button
                              disabled={pending !== null}
                              onClick={() => void enter(item)}
                            >
                              {pending === item.id
                                ? 'Đang mở bài...'
                                : 'Bắt đầu làm bài'}
                            </Button>
                          ) : null}
                          {last && (
                            <Link
                              className="admin-secondary-link"
                              href={'/student/results/' + last.id}
                            >
                              Xem kết quả
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
            {!q.data.items.length && (
              <EmptyState title="Chưa có bài kiểm tra được giao." />
            )}
            <Pagination
              page={page}
              total={q.data.total}
              pageCount={q.data.pageCount}
              onPage={setPage}
              busy={q.isFetching || pending !== null}
            />
          </>
        )}
        <p role="status" className="sr-only">
          {pending ? 'Đang yêu cầu hệ thống mở bài làm' : ''}
        </p>
      </Card>
    </div>
  );
}
