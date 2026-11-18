'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { assignmentAvailability } from '@/lib/assignment-availability';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  StudentHeading,
  ErrorState,
  EmptyState,
  StatusBadge,
  displayDate,
  useStudentSessionError,
} from './student-ui';

const statusLabels = {
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  EXPIRED: 'Hết giờ',
};
export function StudentAssignmentDetail({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const q = useQuery({
    queryKey: ['student-assignment', assignmentId],
    queryFn: () => api.examAssignment(assignmentId),
    staleTime: 0,
    gcTime: 0,
  });
  const [now, setNow] = useState(0),
    [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const busy = useRef(false),
    router = useRouter(),
    cache = useQueryClient();
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
  async function enter(attemptId?: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const attempt = attemptId
        ? await api.attempt(attemptId)
        : await api.startAttempt(assignmentId);
      void cache.invalidateQueries({ queryKey: ['exam-assignments'] });
      void cache.invalidateQueries({
        queryKey: ['student-assignment', assignmentId],
      });
      router.push(
        attempt.status === 'IN_PROGRESS'
          ? '/student/attempts/' + attempt.id
          : '/student/results/' + attempt.id,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause : new Error('Không thể mở bài làm.'),
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (q.isPending) return <p role="status">Đang tải chi tiết bài giao...</p>;
  if (q.isError)
    return (
      <div className="student-page">
        <StudentHeading
          title="Chi tiết bài giao"
          description="Không thể tải bài giao. Bạn vẫn có thể mở lịch sử kết quả của mình."
        />
        <ErrorState error={q.error} retry={() => void q.refetch()} />
        <Link href="/student/results">Lịch sử kết quả của tôi</Link>
      </div>
    );
  const item = q.data,
    attempts = item.attempts ?? [],
    active = attempts.find((a) => a.status === 'IN_PROGRESS'),
    state = assignmentAvailability(item, now);
  return (
    <div className="student-page" data-assignment-id={item.id}>
      <StudentHeading
        title={item.exam.title}
        description="Kiểm tra lịch thi và những lượt làm của chính bạn trước khi vào phòng thi."
      />
      <Card className="student-panel">
        <StatusBadge tone={state === 'Đang mở' ? 'success' : 'neutral'}>
          {state}
        </StatusBadge>
        {item.exam.description && (
          <p className="whitespace-pre-wrap">{item.exam.description}</p>
        )}
        <dl className="student-meta">
          <div>
            <dt>Phiên bản đã giao</dt>
            <dd>
              {item.examVersion
                ? 'v' + item.examVersion.number
                : 'Không khả dụng'}
            </dd>
          </div>
          <div>
            <dt>Thời lượng</dt>
            <dd>
              {item.exam.durationMin === null
                ? 'Không khả dụng'
                : item.exam.durationMin + ' phút'}
            </dd>
          </div>
          <div>
            <dt>Giao cho</dt>
            <dd>
              {item.class
                ? item.class.name + ' · ' + item.class.code
                : 'Cá nhân bạn'}
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
            <dt>Lượt đã dùng / tối đa</dt>
            <dd>
              {item._count.attempts} / {item.maxAttempts}
            </dd>
          </div>
        </dl>
        <p className="muted">
          {item.showScore
            ? 'Điểm được công bố sau khi hoàn tất.'
            : 'Điểm chưa được công bố.'}{' '}
          {item.showAnswers
            ? 'Cho xem đáp án sau khi hoàn tất.'
            : 'Đáp án chưa được công bố.'}{' '}
          Điều kiện bắt đầu và hạn kết thúc được kiểm tra lại khi bạn vào bài.
        </p>
        {error && (
          <ErrorState
            error={error}
            retry={() => {
              setError(null);
              void q.refetch();
            }}
          />
        )}
        <div className="admin-row-actions">
          {active ? (
            <Button disabled={pending} onClick={() => void enter(active.id)}>
              {pending ? 'Đang mở bài...' : 'Tiếp tục làm bài'}
            </Button>
          ) : state === 'Đang mở' ? (
            <Button disabled={pending} onClick={() => void enter()}>
              {pending ? 'Đang mở bài...' : 'Bắt đầu làm bài'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={pending || q.isFetching}
            onClick={() => void q.refetch()}
          >
            Làm mới thông tin
          </Button>
        </div>
      </Card>
      <Card className="student-panel">
        <h2>Lịch sử lượt làm của tôi</h2>
        <Link
          className="admin-secondary-link"
          href={'/student/results?assignmentId=' + assignmentId}
        >
          Tìm và lọc các lượt đã hoàn tất của bài giao
        </Link>
        {attempts.length ? (
          <ul className="student-recent">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <div>
                  <h3>{statusLabels[attempt.status]}</h3>
                  <p>Bắt đầu: {displayDate(attempt.startedAt)}</p>
                  <p>
                    Hoàn tất:{' '}
                    {attempt.submittedAt
                      ? displayDate(attempt.submittedAt)
                      : 'Chưa hoàn tất'}
                  </p>
                </div>
                {attempt.status === 'IN_PROGRESS' ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void enter(attempt.id)}
                  >
                    Mở lượt đang làm
                  </Button>
                ) : (
                  <Link
                    className="admin-secondary-link"
                    href={'/student/results/' + attempt.id}
                  >
                    Xem kết quả lượt làm
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Bạn chưa bắt đầu lượt làm nào." />
        )}
      </Card>
      <p role="status" className="sr-only">
        {pending ? 'Đang yêu cầu hệ thống mở bài làm' : ''}
      </p>
    </div>
  );
}
