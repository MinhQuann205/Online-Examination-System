'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type AssignmentReview, type ExamAssignment } from '@/lib/api';
import type { AssignmentIntent } from '@/lib/assignment-intent';
import { prepareAssignment } from '@/lib/assignment-form';
import { retainChoice, type RemoteChoice } from '@/lib/examination-operations';
import { ExamVersionPicker } from './exam-version-picker';
import { RemoteAssignmentSelect } from './remote-assignment-select';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ConfirmationDialog, ErrorState } from './teacher/teacher-ui';
const date = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('vi-VN') : 'Không giới hạn';
export function AssignmentCreationForm({
  initialSelection = {},
  allowed,
}: {
  initialSelection?: AssignmentIntent;
  allowed: boolean;
}) {
  const client = useQueryClient(),
    [examId, setExamId] = useState(initialSelection.examId ?? ''),
    [examVersionId, setVersion] = useState(
      initialSelection.examVersionId ?? '',
    ),
    [chosenExam, setExam] = useState<RemoteChoice | null>(null),
    [classChoice, setClass] = useState<RemoteChoice | null>(null),
    [studentChoice, setStudent] = useState<RemoteChoice | null>(null);
  const [targetKind, setKind] = useState<'class' | 'student'>('class'),
    [opensAt, setOpens] = useState(''),
    [closesAt, setCloses] = useState(''),
    [maxAttempts, setLimit] = useState('1'),
    [showScore, setScore] = useState(false),
    [showAnswers, setAnswers] = useState(false),
    [confirmation, setConfirmation] = useState<AssignmentReview | null>(null),
    [error, setError] = useState(''),
    [lastCreated, setCreated] = useState<ExamAssignment | null>(null);
  const lookup = useQuery({
    queryKey: ['assignment-exam-selection', examId],
    queryFn: () =>
      api.exams(
        new URLSearchParams({ id: examId, assignable: 'true' }).toString(),
      ),
    enabled: allowed && Boolean(examId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const exam = lookup.data?.items.find((x) => x.id === examId),
    examChoice =
      chosenExam ??
      (exam ? { id: exam.id as string, label: exam.title as string } : null);
  const versions = useQuery({
    queryKey: ['published-version', examId, examVersionId],
    queryFn: () =>
      api.examVersionsPage(
        examId,
        new URLSearchParams({ id: examVersionId }).toString(),
      ),
    enabled: allowed && Boolean(exam && examVersionId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const review = useMutation({
    mutationFn: api.reviewExamAssignment,
    onSuccess: (value) => setConfirmation(value),
  });
  const create = useMutation({
    mutationFn: api.createExamAssignment,
    onSuccess: async (value) => {
      setCreated(value);
      setConfirmation(null);
      setExamId('');
      setExam(null);
      setVersion('');
      await client.invalidateQueries({ queryKey: ['exam-assignments'] });
    },
  });
  const formRef = useRef<HTMLFormElement>(null),
    reviewWasOpen = useRef(false);
  useEffect(() => {
    // The pending review disables the opener before the dialog mounts.
    // Restore the known trigger after the form becomes enabled on dismissal.
    if (!confirmation && reviewWasOpen.current) {
      formRef.current
        ?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.focus();
    }
    reviewWasOpen.current = Boolean(confirmation);
  }, [confirmation]);
  const target = targetKind === 'class' ? classChoice : studentChoice,
    busy = review.isPending || create.isPending;
  async function submit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (busy || confirmation) return;
    setError('');
    if (
      !exam ||
      !target ||
      !examVersionId ||
      !versions.isSuccess ||
      versions.isFetching
    ) {
      setError(
        'Chọn đề, đúng phiên bản đã xuất bản và người nhận; đợi dữ liệu được xác minh.',
      );
      return;
    }
    const prepared = prepareAssignment(
      {
        examId,
        examVersionId,
        targetKind,
        targetId: target.id,
        opensAt,
        closesAt,
        maxAttempts,
        showScore,
        showAnswers,
      },
      {
        exams: [{ id: exam.id, title: exam.title }],
        versions: versions.data.items,
        targets: [{ id: target.id, label: target.label }],
      },
    );
    if (!prepared.ok) {
      setError(prepared.error);
      return;
    }
    try {
      await review.mutateAsync(prepared.body);
    } catch {
      /* Structured query error displayed below. */
    }
  }
  return (
    <Card className="teacher-panel space-y-4">
      <h2>Giao đề đã xuất bản</h2>
      {lastCreated && (
        <div role="status" className="admin-notice">
          Đã giao {lastCreated.exam.title} · v
          {lastCreated.examVersion?.number ?? '—'}.{' '}
          <Link
            className="admin-secondary-link"
            href={'/teacher/assignments/' + lastCreated.id}
          >
            Xem chi tiết bài vừa giao
          </Link>
        </div>
      )}
      {initialSelection.invalid && !examId && (
        <p role="alert">
          Liên kết giao bài không hợp lệ. Hãy chọn đề và phiên bản.
        </p>
      )}
      <form ref={formRef} onSubmit={(e) => void submit(e)}>
        <fieldset
          disabled={!allowed || busy || Boolean(confirmation)}
          className="space-y-4"
        >
          <RemoteAssignmentSelect
            kind="exams"
            enabled={allowed && !busy && !confirmation}
            value={examChoice}
            onChange={(x) => {
              setExam(retainChoice(chosenExam, x));
              setExamId(x?.id ?? '');
              setVersion('');
            }}
          />
          {lookup.isError && (
            <ErrorState
              error={lookup.error}
              retry={() => void lookup.refetch()}
            />
          )}
          {examId && lookup.isSuccess && !exam && (
            <p role="alert">
              Đề không còn khả dụng hoặc ngoài phạm vi. Hãy chọn lại; không tự
              đổi phiên bản.
            </p>
          )}
          <ExamVersionPicker
            key={examId}
            examId={examId}
            value={examVersionId}
            enabled={allowed && Boolean(exam)}
            onChange={setVersion}
            disabled={!exam || busy || Boolean(confirmation)}
          />
          {versions.isError && (
            <ErrorState
              error={versions.error}
              retry={() => void versions.refetch()}
            />
          )}
          {examVersionId &&
            versions.isSuccess &&
            !versions.data.items.some((v) => v.id === examVersionId) && (
              <p role="alert">
                Phiên bản trong liên kết không khả dụng. Không tự chuyển sang
                phiên bản mới nhất.
              </p>
            )}
          <label className="block">
            Giao cho
            <select
              aria-label="Giao cho"
              value={targetKind}
              onChange={(e) => setKind(e.target.value as 'class' | 'student')}
            >
              <option value="class">Cả lớp</option>
              <option value="student">Một học viên</option>
            </select>
          </label>
          {targetKind === 'class' ? (
            <RemoteAssignmentSelect
              kind="classes"
              enabled={allowed && !busy && !confirmation}
              value={classChoice}
              onChange={(x) => setClass(retainChoice(classChoice, x))}
            />
          ) : (
            <RemoteAssignmentSelect
              kind="students"
              enabled={allowed && !busy && !confirmation}
              value={studentChoice}
              onChange={(x) => setStudent(retainChoice(studentChoice, x))}
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              Mở bài
              <Input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpens(e.target.value)}
              />
            </label>
            <label>
              Đóng bài
              <Input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setCloses(e.target.value)}
              />
            </label>
            <label>
              Số lượt làm tối đa
              <Input
                type="number"
                min={1}
                max={20}
                required
                value={maxAttempts}
                onChange={(e) => setLimit(e.target.value)}
              />
            </label>
          </div>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={showScore}
              onChange={(e) => setScore(e.target.checked)}
            />
            Công bố điểm sau khi nộp
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setAnswers(e.target.checked)}
            />
            Công bố đáp án sau khi nộp
          </label>
          <p className="muted">
            Thời gian nhập theo múi giờ trình duyệt. Review chưa tạo bài giao;
            máy chủ kiểm tra lại quyền, người nhận và phiên bản khi xác nhận.
          </p>
          {error && <p role="alert">{error}</p>}
          {review.isError && (
            <ErrorState error={review.error} retry={() => void submit()} />
          )}
          <Button
            type="submit"
            disabled={
              busy ||
              !target ||
              !exam ||
              !examVersionId ||
              !versions.isSuccess ||
              versions.isFetching
            }
          >
            {review.isPending ? 'Đang kiểm tra...' : 'Kiểm tra trước khi giao'}
          </Button>
        </fieldset>
      </form>
      {confirmation && (
        <ConfirmationDialog
          title="Xác nhận giao bài?"
          actionLabel="Xác nhận giao bài"
          description={
            confirmation.exam.title +
            ' · v' +
            confirmation.exam.version +
            ' · ' +
            confirmation.exam.questionCount +
            ' câu · ' +
            confirmation.exam.totalPoints +
            ' điểm · ' +
            confirmation.exam.durationMin +
            ' phút. Người nhận: ' +
            confirmation.recipient.label +
            '. Mở: ' +
            date(confirmation.body.opensAt) +
            '; đóng: ' +
            date(confirmation.body.closesAt) +
            '. Tối đa ' +
            confirmation.body.maxAttempts +
            ' lượt. ' +
            (confirmation.body.showScore ? 'Công bố điểm. ' : 'Ẩn điểm. ') +
            (confirmation.body.showAnswers ? 'Công bố đáp án.' : 'Ẩn đáp án.')
          }
          onClose={() => setConfirmation(null)}
          onConfirm={async () => {
            await create.mutateAsync(confirmation.body);
          }}
        />
      )}
    </Card>
  );
}
