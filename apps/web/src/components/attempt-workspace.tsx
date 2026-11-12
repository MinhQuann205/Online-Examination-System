'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import Link from 'next/link';
import {
  Clock3,
  Flag,
  ListChecks,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { BackButton, usePageNavigation } from './back-navigation';
import { ThemeToggle } from './theme-toggle';
import { WorkspaceDialog } from './exam-workspace-dialog';
import './exam-workspace.css';
import { registerExamGuard } from '@/lib/exam-session-guard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, api, type AttemptRecord } from '@/lib/api';
import { AnswerAutosave, type SaveSnapshot } from '@/lib/answer-autosave';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Answer =
  | { optionId: string }
  | { optionIds: string[] }
  | { pairs: Array<{ leftId: string; rightId: string }> };
type AnswerMap = Record<string, Answer>;
type Question = AttemptRecord['snapshot']['questions'][number];

function parseAnswer(value: unknown): AnswerMap[string] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.optionId === 'string')
    return { optionId: candidate.optionId };
  if (Array.isArray(candidate.optionIds))
    return {
      optionIds: candidate.optionIds.filter(
        (id): id is string => typeof id === 'string',
      ),
    };
  if (Array.isArray(candidate.pairs))
    return {
      pairs: candidate.pairs.filter(
        (pair): pair is { leftId: string; rightId: string } =>
          Boolean(pair) &&
          typeof pair === 'object' &&
          typeof (pair as { leftId?: unknown }).leftId === 'string' &&
          typeof (pair as { rightId?: unknown }).rightId === 'string',
      ),
    };
  return undefined;
}

function DroppableMatchRow({
  pair,
  selected,
}: {
  pair: Question['matchingPairs'][number];
  selected?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `left-${pair.id}`,
    data: { leftId: pair.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border p-3 ${isOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-line'}`}
    >
      <span className="font-medium">{pair.leftText}</span>
      <span className="text-sm text-muted">
        {selected ?? 'Kéo đáp án vào đây'}
      </span>
    </div>
  );
}

function DraggableMatchChoice({
  pair,
  selected,
}: {
  pair: Question['matchingOptions'][number];
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `right-${pair.id}`,
      data: { rightId: pair.id },
      disabled: false,
    });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      aria-pressed={selected}
      className={`touch-none cursor-grab rounded-lg border px-3 py-2 text-left text-sm ${selected ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-blue-300 bg-blue-50 dark:bg-blue-950'}`}
    >
      {pair.rightText}
      {isDragging ? ' · Đang kéo' : ''}
    </button>
  );
}

function MatchingAnswer({
  question,
  answer,
  onChange,
}: {
  question: Question;
  answer: Answer | undefined;
  onChange: (value: Answer) => void;
}) {
  const pairs = question.matchingPairs;
  const options = question.matchingOptions;
  const current = answer && 'pairs' in answer ? answer.pairs : [];
  const shuffledOptions = [...options].reverse();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );
  const assign = (leftId: string, rightId: string) => {
    const previousRight = current.find(
      (pair) => pair.leftId === leftId,
    )?.rightId;
    const previousLeft = current.find(
      (pair) => pair.rightId === rightId,
    )?.leftId;
    const next = current.filter(
      (pair) => pair.leftId !== leftId && pair.rightId !== rightId,
    );
    if (previousRight && previousLeft && previousLeft !== leftId)
      next.push({ leftId: previousLeft, rightId: previousRight });
    if (rightId) next.push({ leftId, rightId });
    onChange({ pairs: next });
  };
  const onDragEnd = (event: DragEndEvent) => {
    const leftId = event.over?.data.current?.leftId;
    const rightId = event.active.data.current?.rightId;
    if (typeof leftId === 'string' && typeof rightId === 'string')
      assign(leftId, rightId);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted">Cột A</p>
          {pairs.map((pair) => {
            const selectedId = current.find(
              (choice) => choice.leftId === pair.id,
            )?.rightId;
            const selected = options.find((item) => item.id === selectedId);
            return (
              <div key={pair.id} className="space-y-2">
                <DroppableMatchRow pair={pair} selected={selected?.rightText} />
                <label
                  className="sr-only"
                  htmlFor={`match-${question.questionId}-${pair.id}`}
                >
                  Ghép {pair.leftText}
                </label>
                <select
                  id={`match-${question.questionId}-${pair.id}`}
                  value={selectedId ?? ''}
                  onChange={(event) => assign(pair.id, event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Chọn cặp tương ứng</option>
                  {shuffledOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.rightText}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted">
            Cột B · kéo đáp án hoặc chọn từ danh sách
          </p>
          <div className="flex flex-wrap gap-2">
            {shuffledOptions.map((pair) => (
              <DraggableMatchChoice
                key={pair.id}
                pair={pair}
                selected={current.some((choice) => choice.rightId === pair.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function AttemptForm({ attempt }: { attempt: AttemptRecord }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    Object.fromEntries(
      attempt.answers.flatMap((row) => {
        const answer = parseAnswer(row.answer);
        return answer ? [[row.questionId, answer]] : [];
      }),
    ),
  );
  const [save, setSave] = useState<SaveSnapshot>({
    state: 'saved',
    message: '',
    hasConflict: false,
    questions: {},
  });
  const [submitError, setSubmitError] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [submissionUnknown, setSubmissionUnknown] = useState(false);
  const [checking, setChecking] = useState(false);
  const { register, previous } = usePageNavigation();
  const requestLeave = useCallback(
    (target: string) => setLeaveTarget(target),
    [],
  );
  const leaveState = useRef({ submitting: false, unknown: false });
  const departureAllowed = useRef(false);
  useEffect(() => register(requestLeave), [register, requestLeave]);
  // The sentinel is one same-document entry per attempt mount. Capture-phase popstate
  // keeps Next from unmounting the queue; confirmation uses a verified internal route.
  useEffect(() => {
    const marker = 'examspace-attempt-' + attempt.id;
    if (history.state?.examspaceAttempt !== marker) {
      history.pushState(
        { ...history.state, examspaceAttempt: marker },
        '',
        location.href,
      );
    }
    let restoring = false;
    const pop = (event: PopStateEvent) => {
      if (departureAllowed.current) return;
      event.stopImmediatePropagation();
      if (restoring) {
        restoring = false;
        return;
      }
      if (event.state?.examspaceAttempt === marker) return;
      restoring = true;
      history.go(1);
      requestLeave(previous('/student/exams'));
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.(
        'a[href]',
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      requestLeave(
        url.origin === location.origin && url.pathname.startsWith('/student/')
          ? url.pathname
          : '/student/exams',
      );
    };
    window.addEventListener('popstate', pop, true);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('popstate', pop, true);
      document.removeEventListener('click', click, true);
    };
  }, [attempt.id, previous, requestLeave]);
  const [submitting, setSubmitting] = useState(false);
  const finishing = useRef(false);
  useEffect(() => {
    leaveState.current = { submitting, unknown: submissionUnknown };
  }, [submitting, submissionUnknown]);
  const [seconds, setSeconds] = useState(0);
  const [clockReady, setClockReady] = useState(false);
  const autosave = useRef<AnswerAutosave<Answer> | null>(null);
  const initialAnswers = useRef(attempt.answers);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [reviewIds, setReviewIds] = useState(attempt.reviewQuestionIds ?? []);
  const review = useMutation({
    mutationFn: async ({
      questionId,
      marked,
    }: {
      questionId: string;
      marked: boolean;
    }) => {
      const result = await api.markReview(attempt.id, questionId, marked);
      if (!result.saved) throw new Error('Lượt làm bài đã hết hạn.');
      return result;
    },
    onSuccess: (result) => setReviewIds(result.reviewQuestionIds),
  });

  useEffect(() => {
    if (attempt.status !== 'IN_PROGRESS') return;
    const message =
      save.state === 'saved'
        ? 'Phòng thi đang mở. Hãy rời hoặc đóng phòng thi trước khi đăng xuất.'
        : 'Bài làm còn câu trả lời chưa được xác nhận lưu. Hãy xử lý trạng thái lưu trước khi rời phòng thi và đăng xuất.';
    const unregister = registerExamGuard(() => message);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !departureAllowed.current &&
        (save.state !== 'saved' ||
          save.hasConflict ||
          review.isPending ||
          finishing.current ||
          leaveState.current.unknown)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [attempt.status, save.state, save.hasConflict, review.isPending]);

  useEffect(() => {
    const queue = new AnswerAutosave<Answer>(
      initialAnswers.current,
      {
        save: (questionId, revision, answer) =>
          api.saveAttemptAnswer(attempt.id, questionId, revision, answer),
        read: () => api.attempt(attempt.id),
        isConflict: (error) =>
          error instanceof ApiError && error.status === 409,
        isRetryable: (error) =>
          !(error instanceof ApiError) || error.status >= 500,
      },
      setSave,
    );
    autosave.current = queue;
    return () => {
      queue.dispose();
      autosave.current = null;
    };
  }, [attempt.id]);

  const changeAnswer = (questionId: string, answer: Answer) => {
    if (finishing.current || submissionUnknown || (clockReady && seconds === 0))
      return;
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    autosave.current?.edit(questionId, answer);
  };

  const retryAnswers = async () => {
    if (
      save.hasConflict &&
      !window.confirm(
        'Đáp án đã thay đổi ở phiên khác. Bạn muốn lưu lựa chọn đang hiển thị thay cho đáp án trên máy chủ?',
      )
    )
      return;
    try {
      await autosave.current?.retry(save.hasConflict);
      setSubmitError('');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Không thể lưu câu trả lời.',
      );
    }
  };

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const current = await api.attempt(attempt.id);
      if (current.status !== 'IN_PROGRESS') {
        departureAllowed.current = true;
        router.replace('/student/results/' + attempt.id);
        return true;
      }
      setSubmissionUnknown(false);
      return false;
    } catch {
      setSubmitError(
        'Chưa xác nhận trạng thái với máy chủ. Bản nháp vẫn ở trang này; kiểm tra kết nối rồi thử lại.',
      );
      return null;
    } finally {
      setChecking(false);
    }
  }, [attempt.id, router]);
  const finish = useCallback(async () => {
    if (finishing.current || submissionUnknown) return;
    finishing.current = true;
    setSubmitting(true);
    setSubmitError('');
    let sent = false;
    try {
      if (!autosave.current) throw new Error('Bài làm chưa sẵn sàng.');
      await autosave.current.flush();
      sent = true;
      const response = await api.submitAttempt(attempt.id);
      if (response.status === 'IN_PROGRESS')
        throw new Error('Máy chủ chưa xác nhận kết thúc bài làm.');
      departureAllowed.current = true;
      router.replace('/student/results/' + attempt.id);
    } catch (error) {
      if (sent) {
        setSubmissionUnknown(true);
        const state = await checkStatus();
        if (state === true) return;
        if (state === null)
          setSubmitError(
            'Chưa xác nhận kết quả nộp bài. Không đóng trang hoặc nộp lặp; hãy kiểm tra trạng thái máy chủ.',
          );
        else
          setSubmitError(
            'Máy chủ vẫn ghi nhận bài đang làm. Có thể thử nộp lại.',
          );
      } else
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Không thể lưu câu trả lời trước khi nộp.',
        );
      finishing.current = false;
      setSubmitting(false);
    }
  }, [attempt.id, router, checkStatus, submissionUnknown]);

  useEffect(() => {
    const update = () => {
      if (!attempt.deadlineAt) return;
      setSeconds(
        Math.max(
          0,
          Math.ceil(
            (new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000,
          ),
        ),
      );
      setClockReady(true);
    };
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [attempt.deadlineAt]);

  useEffect(() => {
    if (!clockReady || seconds !== 0 || attempt.status !== 'IN_PROGRESS')
      return;
    const timer = setTimeout(() => void checkStatus(), 0);
    return () => clearTimeout(timer);
  }, [attempt.status, clockReady, checkStatus, seconds]);

  const questions = [...attempt.snapshot.questions].sort(
    (a, b) => a.position - b.position,
  );
  const answeredCount = questions.filter((question) => {
    const answer = answers[question.questionId];
    if (!answer) return false;
    if ('optionId' in answer) return true;
    if ('optionIds' in answer) return answer.optionIds.length > 0;
    return answer.pairs.length > 0;
  }).length;
  const isAnswered = (questionId: string) => {
    const answer = answers[questionId];
    return Boolean(
      answer &&
      ('optionId' in answer
        ? answer.optionId
        : 'optionIds' in answer
          ? answer.optionIds.length
          : answer.pairs.length),
    );
  };
  const navigate = (index: number) => {
    setCurrentQuestion(index);
    document
      .getElementById(`question-${questions[index].questionId}`)
      ?.focus({ preventScroll: true });
    document
      .getElementById(`question-${questions[index].questionId}`)
      ?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
  };
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');

  const pendingCount = Object.values(save.questions).filter(
    (q) => q.editVersion > q.confirmedVersion,
  ).length;
  const errorCount = Object.values(save.questions).filter(
    (q) => q.phase === 'ERROR',
  ).length;
  const editLocked =
    submitting || submissionUnknown || (clockReady && seconds === 0);
  const palette = () => (
    <>
      <h2>Mục lục câu hỏi</h2>
      <nav aria-label="Điều hướng câu hỏi" className="exam-question-grid">
        {questions.map((question, index) => (
          <button
            key={question.questionId}
            type="button"
            data-answered={isAnswered(question.questionId)}
            data-review={reviewIds.includes(question.questionId)}
            aria-current={index === currentQuestion ? 'step' : undefined}
            aria-label={`Đến câu ${index + 1}: ${isAnswered(question.questionId) ? 'đã trả lời' : 'chưa trả lời'}${reviewIds.includes(question.questionId) ? ', cần xem lại' : ''}`}
            onClick={() => {
              setPaletteOpen(false);
              requestAnimationFrame(() => navigate(index));
            }}
          >
            {index + 1}
          </button>
        ))}
      </nav>
      <p className="exam-summary">
        {answeredCount} câu đã trả lời · {questions.length - answeredCount} câu
        chưa trả lời · {reviewIds.length} câu xem lại · Đang xem câu{' '}
        {currentQuestion + 1}
      </p>
      <p className="exam-summary">
        Đã trả lời không đồng nghĩa đã được máy chủ xác nhận lưu. ★ Cần xem lại.
      </p>
    </>
  );
  return (
    <main className="exam-workspace">
      <a href="#exam-questions" className="skip-link">
        Đến câu hỏi
      </a>
      <header className="exam-header">
        <div className="exam-header-inner">
          <div>
            <BackButton
              fallback="/student/exams"
              label="Quay lại danh sách bài thi"
              onClick={() => requestLeave('/student/exams')}
            />
            <h1>{attempt.snapshot.title}</h1>
            <div className="exam-meta">
              <span>Đang làm bài</span>
              <span>
                {questions.length} câu · {attempt.snapshot.durationMin} phút ·
                Phiên bản {attempt.version}
              </span>
            </div>
          </div>
          <div className="exam-header-actions">
            <div
              className={`exam-timer ${clockReady && seconds < 300 ? 'is-urgent' : ''}`}
              role="timer"
              aria-label="Thời gian còn lại"
              aria-live="off"
            >
              <Clock3 size={22} />
              <div>
                <small>Thời gian còn lại</small>
                <strong>
                  {clockReady ? minutes + ':' + remainder : 'Đang đồng bộ'}
                </strong>
              </div>
            </div>
            <ThemeToggle />
            <Button
              type="button"
              disabled={editLocked || review.isPending}
              onClick={() => setSubmitOpen(true)}
            >
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </Button>
          </div>
        </div>
        <progress
          className="exam-progress"
          aria-label="Tiến độ trả lời"
          max={questions.length || 1}
          value={answeredCount}
        />
      </header>
      <div className="exam-layout">
        <div className="exam-main">
          <nav aria-label="Đường dẫn phòng thi" className="exam-meta">
            <button
              type="button"
              onClick={() => requestLeave('/student/exams')}
            >
              Bài thi được giao
            </button>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Làm bài</span>
          </nav>
          {attempt.snapshot.description && (
            <p className="exam-summary">{attempt.snapshot.description}</p>
          )}
          <div className="exam-save-box" data-state={save.state}>
            <p role={save.state === 'error' ? 'alert' : 'status'}>
              {save.state === 'saved'
                ? 'Đã lưu trên máy chủ'
                : save.state === 'saving'
                  ? 'Đang lưu câu trả lời…'
                  : save.hasConflict
                    ? 'Xung đột phiên bản (409). ' + save.message
                    : 'Lỗi lưu. ' + save.message}
            </p>
            <p>
              {pendingCount} câu trả lời chưa được xác nhận · {errorCount} lỗi
              lưu
            </p>
            {save.state === 'error' && (
              <Button
                type="button"
                variant="outline"
                disabled={submitting || submissionUnknown}
                onClick={() => void retryAnswers()}
              >
                Thử lưu lại
              </Button>
            )}
          </div>
          {clockReady && seconds <= 300 && (
            <p role="status" className="exam-notice">
              {seconds === 0
                ? 'Đã đến hạn theo đồng hồ thiết bị. Đang chờ máy chủ xác nhận trạng thái; không thể sửa thêm.'
                : seconds <= 60
                  ? 'Còn dưới một phút. Hãy kiểm tra trạng thái lưu.'
                  : 'Còn dưới năm phút làm bài.'}
            </p>
          )}
          {(submitError || submissionUnknown) && (
            <div className="exam-notice" role="alert">
              <p>{submitError}</p>
              <Button
                type="button"
                variant="outline"
                disabled={checking}
                onClick={() => void checkStatus()}
              >
                {checking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái máy chủ'}
              </Button>
            </div>
          )}
          <div className="exam-controls">
            <Button
              type="button"
              variant="outline"
              disabled={currentQuestion === 0}
              onClick={() => navigate(currentQuestion - 1)}
            >
              <ArrowLeft size={17} />
              Câu trước
            </Button>
            <Button
              type="button"
              className="exam-mobile-palette"
              variant="outline"
              onClick={() => setPaletteOpen(true)}
            >
              <ListChecks size={17} />
              Mục lục câu hỏi
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={currentQuestion === questions.length - 1}
              onClick={() => navigate(currentQuestion + 1)}
            >
              Câu sau
              <ArrowRight size={17} />
            </Button>
          </div>
          {review.error && <p role="alert">{review.error.message}</p>}
          <fieldset disabled={editLocked} id="exam-questions">
            <legend className="sr-only">Câu hỏi và câu trả lời</legend>
            {questions.map((question, index) => (
              <Card
                id={`question-${question.questionId}`}
                key={question.questionId}
                tabIndex={-1}
                data-current={index === currentQuestion}
                className="exam-question-card"
              >
                <div className="exam-question-heading">
                  <span className="exam-question-tag">
                    Câu {index + 1} ·{' '}
                    {question.type === 'SINGLE_CHOICE'
                      ? 'Một đáp án'
                      : question.type === 'MULTIPLE_CHOICE'
                        ? 'Nhiều đáp án'
                        : 'Ghép nối'}
                  </span>
                  <span className="exam-question-points">
                    {question.points} điểm
                  </span>
                </div>
                <h2>
                  Câu {index + 1}. {question.content}
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  disabled={review.isPending}
                  aria-pressed={reviewIds.includes(question.questionId)}
                  onClick={() =>
                    review.mutate({
                      questionId: question.questionId,
                      marked: !reviewIds.includes(question.questionId),
                    })
                  }
                >
                  <Flag size={16} />
                  {reviewIds.includes(question.questionId)
                    ? 'Bỏ đánh dấu xem lại'
                    : 'Đánh dấu xem lại'}
                </Button>
                <p className="exam-summary">
                  {isAnswered(question.questionId)
                    ? 'Đã trả lời'
                    : 'Chưa trả lời'}{' '}
                  ·{' '}
                  {save.questions[question.questionId]?.phase === 'ERROR'
                    ? 'Lưu thất bại'
                    : (save.questions[question.questionId]?.editVersion ?? 0) >
                        (save.questions[question.questionId]
                          ?.confirmedVersion ?? 0)
                      ? 'Chưa xác nhận lưu'
                      : 'Đã xác nhận trạng thái trên máy chủ'}
                </p>
                {question.type === 'SINGLE_CHOICE' && (
                  <div
                    className="exam-options"
                    role="radiogroup"
                    aria-label={'Đáp án câu ' + (index + 1)}
                  >
                    {question.options.map((option) => {
                      const selected = answers[question.questionId];
                      const checked = Boolean(
                        selected &&
                        'optionId' in selected &&
                        selected.optionId === option.id,
                      );
                      return (
                        <label key={option.id} className="exam-option">
                          <input
                            type="radio"
                            name={question.questionId}
                            checked={checked}
                            onChange={() =>
                              changeAnswer(question.questionId, {
                                optionId: option.id,
                              })
                            }
                          />
                          <span>{option.content}</span>
                          {checked && (
                            <CheckCircle2 size={20} aria-hidden="true" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {question.type === 'MULTIPLE_CHOICE' && (
                  <div
                    className="exam-options"
                    role="group"
                    aria-label={'Đáp án câu ' + (index + 1)}
                  >
                    {question.options.map((option) => {
                      const value = answers[question.questionId],
                        selected =
                          value && 'optionIds' in value ? value.optionIds : [];
                      return (
                        <label key={option.id} className="exam-option">
                          <input
                            type="checkbox"
                            checked={selected.includes(option.id)}
                            onChange={(e) =>
                              changeAnswer(question.questionId, {
                                optionIds: e.target.checked
                                  ? [...selected, option.id]
                                  : selected.filter((id) => id !== option.id),
                              })
                            }
                          />
                          <span>{option.content}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {question.type === 'MATCHING' && (
                  <MatchingAnswer
                    question={question}
                    answer={answers[question.questionId]}
                    onChange={(value) =>
                      changeAnswer(question.questionId, value)
                    }
                  />
                )}
              </Card>
            ))}
          </fieldset>
          <div className="exam-controls">
            <span className="exam-summary">
              Rời trang không nộp bài. Chỉ dữ liệu được máy chủ xác nhận mới
              được khôi phục.
            </span>
            <BackButton
              fallback="/student/exams"
              label="Rời phòng thi"
              onClick={() => requestLeave('/student/exams')}
            />
          </div>
        </div>
        <aside className="exam-sidebar">
          <section className="exam-palette" aria-label="Tiến độ làm bài">
            {palette()}
          </section>
          <div className="exam-notice">
            <strong>Lưu ý khi làm bài</strong>
            <p className="exam-summary">
              Đáp án được tự động gửi khi bạn chỉnh sửa. Giữ trang mở nếu đang
              lưu hoặc có lỗi. Thời hạn và kết quả do máy chủ quyết định.
            </p>
          </div>
        </aside>
      </div>
      {paletteOpen && (
        <WorkspaceDialog
          title="Mục lục câu hỏi"
          onClose={() => setPaletteOpen(false)}
        >
          {palette()}
          <Button
            type="button"
            autoFocus
            variant="outline"
            onClick={() => setPaletteOpen(false)}
          >
            Đóng mục lục
          </Button>
        </WorkspaceDialog>
      )}
      {submitOpen && (
        <WorkspaceDialog
          title="Xác nhận nộp bài?"
          onClose={() => {
            if (!submitting) setSubmitOpen(false);
          }}
        >
          <p>
            {questions.length} câu · {questions.length - answeredCount} chưa trả
            lời · {reviewIds.length} đánh dấu xem lại.
          </p>
          <p>
            {pendingCount} câu chưa xác nhận lưu · {errorCount} lỗi ·{' '}
            {save.hasConflict
              ? 'Có xung đột phiên bản'
              : 'Không có xung đột đã ghi nhận'}
            .
          </p>
          <p>
            {submissionUnknown
              ? 'Kết quả nộp chưa xác nhận. Hãy kiểm tra máy chủ trước khi thử lại.'
              : save.state === 'error'
                ? 'Chưa xác nhận kết nối/lưu. Xử lý lỗi trước khi nộp.'
                : 'Hệ thống sẽ chờ máy chủ xác nhận mọi đáp án trước khi gửi yêu cầu nộp.'}
          </p>
          {submitError && <p role="alert">{submitError}</p>}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              autoFocus
              disabled={submitting}
              onClick={() => setSubmitOpen(false)}
            >
              Tiếp tục làm bài
            </Button>
            {submissionUnknown ? (
              <Button
                type="button"
                disabled={checking}
                onClick={() => void checkStatus()}
              >
                Kiểm tra trạng thái máy chủ
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting || save.hasConflict || review.isPending}
                onClick={() => void finish()}
              >
                {submitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
              </Button>
            )}
          </div>
        </WorkspaceDialog>
      )}
      {leaveTarget && (
        <WorkspaceDialog
          title="Rời phòng thi?"
          onClose={() => setLeaveTarget(null)}
        >
          <p>
            Bài thi chưa được nộp. Rời trang không nộp hoặc hủy lượt làm; thời
            hạn vẫn tiếp tục.
          </p>
          <p>
            {submitting
              ? 'Đang nộp bài; hãy đợi máy chủ xác nhận trước khi rời trang.'
              : submissionUnknown
                ? 'Kết quả nộp chưa xác nhận. Kiểm tra trạng thái trước khi rời trang.'
                : review.isPending
                  ? 'Đang lưu đánh dấu xem lại; hãy đợi máy chủ xác nhận trước khi rời trang.'
                  : save.hasConflict
                    ? 'Đang có xung đột phiên bản. Lựa chọn local chưa được xác nhận.'
                    : save.state === 'saving'
                      ? 'Có câu trả lời đang chờ lưu. Rời trang có thể làm mất các thay đổi chưa được xác nhận.'
                      : save.state === 'error'
                        ? 'Có câu trả lời lưu thất bại. Rời trang có thể làm mất bản nháp chưa được xác nhận.'
                        : 'Các câu trả lời hiện tại đã được máy chủ xác nhận lưu.'}
          </p>
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              autoFocus
              onClick={() => setLeaveTarget(null)}
            >
              Ở lại phòng thi
            </Button>
            {save.state === 'error' && (
              <Button
                type="button"
                disabled={submitting || submissionUnknown}
                variant="outline"
                onClick={() => void retryAnswers()}
              >
                Thử lưu lại
              </Button>
            )}
            <Button
              type="button"
              disabled={submitting || submissionUnknown || review.isPending}
              onClick={() => {
                if (
                  leaveState.current.submitting ||
                  leaveState.current.unknown ||
                  review.isPending
                )
                  return;
                departureAllowed.current = true;
                router.replace(leaveTarget);
              }}
            >
              Tôi hiểu, rời phòng thi
            </Button>
          </div>
        </WorkspaceDialog>
      )}
    </main>
  );
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const session = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const attempt = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.attempt(attemptId),
    enabled: session.data?.role === 'STUDENT',
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
    gcTime: 0,
  });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && session.data.role !== 'STUDENT')
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  if (session.isError || (session.data && session.data.role !== 'STUDENT'))
    return (
      <main role="alert" className="p-8">
        Không thể xác nhận quyền truy cập phòng thi.
      </main>
    );
  if (session.isPending || attempt.isPending)
    return <main className="p-8 text-muted">Đang khôi phục bài làm...</main>;
  if (attempt.isError)
    return (
      <main role="alert" className="p-8 text-red-600">
        {attempt.error.message}
        <Button type="button" onClick={() => void attempt.refetch()}>
          Thử lại
        </Button>
        <BackButton fallback="/student/exams" />
      </main>
    );
  if (attempt.data.status !== 'IN_PROGRESS')
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Card className="space-y-4 p-6">
          <h1 className="text-xl font-bold">Lượt làm bài đã kết thúc</h1>
          <BackButton fallback="/student/exams" />
          <Link
            href={`/student/results/${attemptId}`}
            className="text-blue-700 hover:underline"
          >
            Xem kết quả
          </Link>
        </Card>
      </main>
    );
  return <AttemptForm key={attempt.data.id} attempt={attempt.data} />;
}
