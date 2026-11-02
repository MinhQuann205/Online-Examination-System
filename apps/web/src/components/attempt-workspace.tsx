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
      className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border p-3 ${isOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'}`}
    >
      <span className="font-medium">{pair.leftText}</span>
      <span className="text-sm text-slate-500">
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
          <p className="text-xs font-semibold uppercase text-slate-500">
            Cột A
          </p>
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
          <p className="text-xs font-semibold uppercase text-slate-500">
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
  const [submitting, setSubmitting] = useState(false);
  const finishing = useRef(false);
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
    if (finishing.current) return;
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

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (!autosave.current) throw new Error('Bài làm chưa sẵn sàng.');
      await autosave.current.flush();
      await api.submitAttempt(attempt.id);
      router.push(`/student/results/${attempt.id}`);
    } catch (error) {
      const current = await api.attempt(attempt.id).catch(() => null);
      if (current && current.status !== 'IN_PROGRESS') {
        router.push(`/student/results/${attempt.id}`);
        return;
      }
      setSubmitError(
        error instanceof Error ? error.message : 'Không thể nộp bài.',
      );
      finishing.current = false;
      setSubmitting(false);
    }
  }, [attempt.id, router]);

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
    const timer = setTimeout(() => void finish(), 0);
    return () => clearTimeout(timer);
  }, [attempt.status, clockReady, finish, seconds]);

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
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-28 sm:p-8">
      <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95 sm:-mx-8 sm:px-8">
        <div>
          <h1 className="font-semibold">{attempt.snapshot.title}</h1>
          <p className="text-xs text-slate-500">
            {answeredCount}/{questions.length} câu đã trả lời
          </p>
        </div>
        <div
          className={`rounded-lg px-3 py-2 font-mono text-lg font-bold ${seconds < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}
          aria-label="Thời gian còn lại"
          aria-live="polite"
        >
          {minutes}:{remainder}
        </div>
      </header>

      {attempt.snapshot.description && (
        <p className="text-sm text-slate-500">{attempt.snapshot.description}</p>
      )}
      {save.state === 'saving' && (
        <p role="status" className="text-sm text-blue-700">
          Đang lưu câu trả lời…
        </p>
      )}
      {save.state === 'saved' && (
        <p role="status" className="text-sm text-emerald-700">
          Đã lưu trên máy chủ
        </p>
      )}
      {save.state === 'error' && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-sm text-red-600"
        >
          <span>{save.message || 'Lưu câu trả lời thất bại.'}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => void retryAnswers()}
          >
            Thử lưu lại
          </Button>
        </div>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}
      <section
        aria-label="Tiến độ làm bài"
        className="space-y-3 rounded-xl border p-4"
      >
        <p>
          {answeredCount} câu đã trả lời · {questions.length - answeredCount}{' '}
          câu chưa trả lời · Đang xem câu {currentQuestion + 1}
        </p>
        <progress
          aria-label="Tiến độ trả lời"
          max={questions.length}
          value={answeredCount}
          className="h-3 w-full"
        />
        <nav aria-label="Điều hướng câu hỏi" className="flex flex-wrap gap-2">
          {questions.map((question, index) => (
            <Button
              key={question.questionId}
              type="button"
              variant="outline"
              aria-current={index === currentQuestion ? 'step' : undefined}
              onClick={() => navigate(index)}
              aria-label={`Đến câu ${index + 1}: ${isAnswered(question.questionId) ? 'đã trả lời' : 'chưa trả lời'}${reviewIds.includes(question.questionId) ? ', cần xem lại' : ''}`}
            >
              {index + 1}
              {reviewIds.includes(question.questionId) ? ' ★' : ''}
            </Button>
          ))}
        </nav>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={currentQuestion === 0}
            onClick={() => navigate(currentQuestion - 1)}
          >
            Câu trước
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={currentQuestion === questions.length - 1}
            onClick={() => navigate(currentQuestion + 1)}
          >
            Câu sau
          </Button>
        </div>
        {review.error && (
          <p role="alert" className="text-red-600">
            {review.error.message}
          </p>
        )}
      </section>
      <fieldset disabled={submitting} className="space-y-4">
        {questions.map((question, index) => (
          <Card
            id={`question-${question.questionId}`}
            key={question.questionId}
            className="scroll-mt-32 space-y-4 p-4 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">
                Câu {index + 1}. {question.content}
              </h2>
              <span className="shrink-0 text-xs text-slate-500">
                {question.points} điểm
              </span>
            </div>
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
              {reviewIds.includes(question.questionId)
                ? 'Bỏ đánh dấu xem lại'
                : 'Đánh dấu xem lại'}
            </Button>
            {question.type === 'SINGLE_CHOICE' && (
              <div className="space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.questionId];
                  return (
                    <label
                      key={option.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <input
                        type="radio"
                        name={question.questionId}
                        checked={Boolean(
                          selected &&
                          'optionId' in selected &&
                          selected.optionId === option.id,
                        )}
                        onChange={() =>
                          changeAnswer(question.questionId, {
                            optionId: option.id,
                          })
                        }
                      />
                      {option.content}
                    </label>
                  );
                })}
              </div>
            )}
            {question.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {question.options.map((option) => {
                  const value = answers[question.questionId];
                  const selected =
                    value && 'optionIds' in value ? value.optionIds : [];
                  return (
                    <label
                      key={option.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(option.id)}
                        onChange={(event) =>
                          changeAnswer(question.questionId, {
                            optionIds: event.target.checked
                              ? [...selected, option.id]
                              : selected.filter((id) => id !== option.id),
                          })
                        }
                      />
                      {option.content}
                    </label>
                  );
                })}
              </div>
            )}
            {question.type === 'MATCHING' && (
              <MatchingAnswer
                question={question}
                answer={answers[question.questionId]}
                onChange={(value) => changeAnswer(question.questionId, value)}
              />
            )}
          </Card>
        ))}
      </fieldset>

      <footer className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t bg-white/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95 sm:px-8">
        <p className="hidden text-sm text-slate-500 sm:block">
          Lượt làm được khôi phục từ dữ liệu đã lưu trên máy chủ.
        </p>
        <Button
          type="button"
          className="ml-auto"
          disabled={submitting || attempt.status !== 'IN_PROGRESS'}
          onClick={() => {
            if (window.confirm('Bạn chắc chắn muốn nộp bài?')) void finish();
          }}
        >
          {submitting ? 'Đang nộp...' : 'Nộp bài'}
        </Button>
      </footer>
    </main>
  );
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  const attempt = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.attempt(attemptId),
    enabled: session.data?.role === 'STUDENT',
    retry: false,
  });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && session.data.role !== 'STUDENT')
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  if (session.isPending || attempt.isPending)
    return (
      <main className="p-8 text-slate-500">Đang khôi phục bài làm...</main>
    );
  if (attempt.isError)
    return (
      <main role="alert" className="p-8 text-red-600">
        {attempt.error.message}
      </main>
    );
  if (attempt.data.status !== 'IN_PROGRESS')
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Card className="space-y-4 p-6">
          <h1 className="text-xl font-bold">Lượt làm bài đã kết thúc</h1>
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
