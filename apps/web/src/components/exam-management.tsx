'use client';

import Link from 'next/link';
import { preparationSummary } from '@/lib/examination-operations';
import {
  assignmentListHref,
  readAssignmentListFilters,
} from '@/lib/academic-navigation';
import {
  readExamFilters,
  examListHref,
  examContextHref,
  type ExamFilters,
} from '@/lib/management-page-state';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { addQuestions } from '@/lib/question-selection';
import { QuestionBankPreview } from '@/components/teacher/question-bank-preview';
import { ExamVersionPicker } from './exam-version-picker';
import { examAuthoringError } from '@/lib/authoring-validation';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/teacher/teacher-ui';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { assignmentHref } from '@/lib/assignment-intent';
import {
  ExamLifecycleDialog,
  type ExamLifecycleAction,
} from '@/components/teacher/exam-lifecycle-dialog';
import { examPreviewHref } from '@/lib/exam-preview-selection';

type ExamState = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type Question = {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING';
  content: string;
  topic?: string | null;
  difficulty?: string;
};
type ExamSummary = {
  id: string;
  title: string;
  status: ExamState;
  durationMin: number;
  version: number;
  structure?: {
    kind: 'DRAFT' | 'PUBLISHED_SNAPSHOT' | 'UNAVAILABLE';
    version: number;
    questionCount: number | null;
    totalPoints: string | null;
    durationMin: number | null;
  };
  _count: { assignments: number; attempts: number };
};
type ExamRecord = ExamSummary & {
  description: string | null;
  questions: Array<{
    questionId: string;
    points: number | string;
    questionSnapshot?: { content?: string };
  }>;
  versions: Array<{ id: string; number: number; publishedAt: string }>;
};
type ExamPreviewPayload = {
  draft: boolean;
  version?: number;
  examVersionId?: string;
  publishedAt?: string;
  snapshot: {
    title: string;
    description: string | null;
    durationMin: number;
    questions: Array<{
      id: string;
      questionId: string;
      type: Question['type'];
      content: string;
      position: number;
      points: number;
      options: Array<{ id: string; content: string; isCorrect: boolean }>;
      matchingPairs: Array<{
        id: string;
        rightId: string;
        leftText: string;
        rightText: string;
      }>;
    }>;
  };
};

const stateLabels: Record<ExamState, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Đã lưu trữ',
};
const typeLabels: Record<Question['type'], string> = {
  SINGLE_CHOICE: 'Một đáp án',
  MULTIPLE_CHOICE: 'Nhiều đáp án',
  MATCHING: 'Ghép nối',
};

function useTeacherAccess() {
  const router = useRouter();
  const session = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
  });
  useEffect(() => {
    if (session.isError) router.replace('/login');
    if (session.data && session.data.role !== 'TEACHER')
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [router, session.data, session.isError]);
  return session;
}

export function ExamList({
  initialFilters = readExamFilters({}),
}: {
  initialFilters?: ExamFilters;
}) {
  const session = useTeacherAccess();
  const cache = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const { page, search, status } = filters;
  function updateFilters(patch: Partial<ExamFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    window.history.replaceState(null, '', examListHref(next));
  }
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{
    id: string;
    title: string;
    kind: ExamLifecycleAction;
  } | null>(null);
  const query = new URLSearchParams({ page: String(page) });
  if (search.trim()) query.set('search', search.trim());
  if (status) query.set('status', status);
  const exams = useQuery({
    queryKey: ['exams', 'structure', search.trim(), status, page],
    queryFn: () => api.exams(query.toString() + '&overview=true'),
    enabled: session.data?.role === 'TEACHER',
  });
  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: string }) => {
      if (kind === 'publish') return api.publishExam(id);
      if (kind === 'version') return api.newExamVersion(id);
      return api.archiveExam(id);
    },
    onSuccess: async (_data, { id }) => {
      setNotice('Đã cập nhật đề thi.');
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['exams'] }),
        cache.invalidateQueries({ queryKey: ['exam', id] }),
        cache.invalidateQueries({ queryKey: ['exam-preview', id] }),
      ]);
    },
    onError: (error: Error) => setNotice(error.message),
  });

  if (session.isPending || !session.data)
    return <div className="p-8 text-slate-500">Đang xác thực phiên...</div>;
  return (
    <div className="teacher-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">ExamSpace</p>
          <h1 className="mt-2 text-3xl font-bold">Quản lý đề thi</h1>
          <p className="mt-2 text-slate-500">
            Soạn đề từ ngân hàng câu hỏi và quản lý các phiên bản đã xuất bản.
          </p>
        </div>
        <Link href="/teacher/exams/new">
          <Button type="button">Tạo đề thi</Button>
        </Link>
      </header>
      {notice && (
        <p role="status" className="text-sm text-blue-700">
          {notice}
        </p>
      )}
      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="Tìm đề thi"
            placeholder="Tìm theo tên đề..."
            maxLength={200}
            value={search}
            onChange={(event) => {
              updateFilters({ search: event.target.value, page: 1 });
            }}
          />
          <select
            aria-label="Lọc trạng thái đề thi"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={status}
            onChange={(event) => {
              updateFilters({ status: event.target.value, page: 1 });
            }}
          >
            <option value="">Mọi trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
        </div>
        {exams.isPending ? (
          <p className="text-slate-500">Đang tải danh sách đề thi...</p>
        ) : exams.isError ? (
          <ErrorState error={exams.error} retry={() => void exams.refetch()} />
        ) : exams.data.items.length === 0 ? (
          <p className="text-slate-500">Chưa có đề thi phù hợp.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(exams.data.items as ExamSummary[]).map((exam) => (
              <li
                key={exam.id}
                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={examContextHref(exam.id, filters)}
                    className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    {exam.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {stateLabels[exam.status as ExamState]} · phiên bản{' '}
                    {exam.version} · {exam._count.assignments} lượt giao
                  </p>
                  <p className="muted">
                    {exam.structure && exam.structure.kind !== 'UNAVAILABLE' ? (
                      <>
                        {exam.structure.kind === 'DRAFT'
                          ? 'Cấu hình nháp'
                          : 'Snapshot đã xuất bản'}{' '}
                        · {exam.structure.questionCount} câu · Tổng điểm cấu
                        hình {exam.structure.totalPoints} ·{' '}
                        {exam.structure.durationMin} phút
                      </>
                    ) : (
                      'Cấu trúc phiên bản hiện tại không khả dụng'
                    )}
                  </p>
                  <Link
                    className="mr-3 text-sm underline"
                    href={assignmentListHref(
                      readAssignmentListFilters({ listExamId: exam.id }),
                    )}
                  >
                    Bài đã giao
                  </Link>
                  <Link
                    href={'/teacher/exams/' + exam.id + '/results'}
                    className="text-sm underline"
                  >
                    Báo cáo lịch sử
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exam.status === 'DRAFT' && (
                    <>
                      <Link href={`/teacher/exams/${exam.id}/edit`}>
                        <Button type="button" variant="outline">
                          Chỉnh sửa
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        disabled={action.isPending}
                        onClick={() =>
                          setConfirmation({
                            id: exam.id,
                            title: exam.title,
                            kind: 'publish',
                          })
                        }
                      >
                        Xuất bản
                      </Button>
                    </>
                  )}
                  {exam.status === 'PUBLISHED' && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() =>
                        setConfirmation({
                          id: exam.id,
                          title: exam.title,
                          kind: 'version',
                        })
                      }
                    >
                      Tạo phiên bản mới
                    </Button>
                  )}
                  {exam.status !== 'ARCHIVED' && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={action.isPending}
                      onClick={() =>
                        setConfirmation({
                          id: exam.id,
                          title: exam.title,
                          kind: 'archive',
                        })
                      }
                    >
                      Lưu trữ
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {exams.data && !exams.isError && (
          <Pagination
            page={page}
            total={exams.data.total}
            pageCount={exams.data.pageCount}
            onPage={(page) => updateFilters({ page })}
            busy={exams.isFetching}
          />
        )}
      </Card>
      {confirmation && (
        <ExamLifecycleDialog
          {...confirmation}
          onClose={() => setConfirmation(null)}
          onConfirm={async () => {
            await action.mutateAsync({
              id: confirmation.id,
              kind: confirmation.kind,
            });
          }}
        />
      )}
    </div>
  );
}

export function ExamEditor({ examId }: { examId?: string }) {
  const session = useTeacherAccess();
  const exam = useQuery({
    queryKey: ['exam', examId, 'lean'],
    queryFn: () => api.exam(examId!, 'versions=none'),
    enabled: Boolean(examId && session.data?.role === 'TEACHER'),
  });
  if (session.isPending || !session.data)
    return <div className="p-8 text-slate-500">Đang xác thực phiên...</div>;
  if (session.data.role !== 'TEACHER') return null;
  if (examId && exam.isPending)
    return <div className="p-8 text-slate-500">Đang tải đề thi...</div>;
  if (examId && (exam.isError || exam.data?.status !== 'DRAFT'))
    return (
      <div className="mx-auto max-w-4xl p-5 sm:p-8">
        <p role="alert" className="text-red-600">
          {exam.error?.message ??
            'Chỉ có thể chỉnh sửa đề thi ở trạng thái nháp.'}
        </p>
      </div>
    );
  return (
    <ExamEditorForm
      key={examId ?? 'new'}
      examId={examId}
      initialExam={exam.data as ExamRecord | undefined}
    />
  );
}

function ExamEditorForm({
  examId,
  initialExam,
}: {
  examId?: string;
  initialExam?: ExamRecord;
}) {
  const router = useRouter();
  const cache = useQueryClient();
  const [title, setTitle] = useState(() => initialExam?.title ?? '');
  const [description, setDescription] = useState(
    () => initialExam?.description ?? '',
  );
  const [durationMin, setDurationMin] = useState(
    () => initialExam?.durationMin ?? 30,
  );
  const [points, setPoints] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initialExam?.questions ?? []).map((row) => [
        row.questionId,
        String(row.points),
      ]),
    ),
  );
  const [order, setOrder] = useState<string[]>(
    () => initialExam?.questions.map((q) => q.questionId) ?? [],
  );
  const [questionPage, setQuestionPage] = useState(1);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionType, setQuestionType] = useState(''),
    [questionTopic, setQuestionTopic] = useState(''),
    [questionDifficulty, setQuestionDifficulty] = useState(''),
    [defaultPoints, setDefaultPoints] = useState('1'),
    [previewId, setPreviewId] = useState('');
  const query = new URLSearchParams({
    page: String(questionPage),
    limit: '20',
    search: questionSearch.trim(),
    type: questionType,
    topic: questionTopic.trim(),
    difficulty: questionDifficulty,
  });
  const bank = useQuery({
    queryKey: ['questions', 'exam-editor', query.toString()],
    queryFn: () => api.questions(query.toString()),
    retry: false,
  });
  const visibleQuestions = (bank.data?.items ?? []) as Question[];
  const questionsPending = bank.isPending;
  const questionsError = bank.error?.message;
  const [questionNames, setQuestionNames] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (initialExam?.questions ?? []).map((q) => [
          q.questionId,
          q.questionSnapshot?.content ?? q.questionId,
        ]),
      ),
  );
  function selectQuestions(ids: string[], include: boolean) {
    setNotice('');
    if (include) {
      try {
        const next = addQuestions(order, points, ids, defaultPoints);
        setOrder(next.order);
        setPoints(next.points);
        setQuestionNames((current) => {
          const names = {
            ...current,
            ...Object.fromEntries(
              visibleQuestions.map((q) => [q.id, q.content]),
            ),
          };
          return Object.fromEntries(
            next.order.map((id) => [id, names[id] ?? id]),
          );
        });
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : 'Không thể chọn câu hỏi',
        );
      }
    } else {
      const removed = new Set(ids);
      setQuestionNames((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !removed.has(id)),
        ),
      );
      setOrder((current) => current.filter((id) => !removed.has(id)));
      setPoints((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !removed.has(id)),
        ),
      );
    }
  }
  const move = (index: number, delta: number) =>
    setOrder((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  const [notice, setNotice] = useState('');
  const save = useMutation({
    mutationFn: async () => {
      const selected = order.map((questionId) => ({
        questionId,
        points: Number(points[questionId]),
      }));
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        durationMin: Number(durationMin),
        questions: selected,
      };
      return examId ? api.updateExam(examId, body) : api.createExam(body);
    },
    onSuccess: async (saved: { id: string }) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['exam', saved.id] }),
        cache.invalidateQueries({ queryKey: ['exam-preview', saved.id] }),
        cache.invalidateQueries({ queryKey: ['exams'] }),
      ]);
      router.push(`/teacher/exams/${saved.id}`);
      router.refresh();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    const error = examAuthoringError({
      title,
      description,
      durationMin,
      order,
      points,
    });
    if (error) {
      setNotice(error);
      return;
    }
    save.mutate();
  }

  return (
    <div className="teacher-page">
      <div>
        <h1 className="mt-3 text-3xl font-bold">
          {examId ? 'Chỉnh sửa đề thi' : 'Tạo đề thi'}
        </h1>
        <p className="mt-2 text-slate-500">
          Chọn câu hỏi trong ngân hàng, đặt điểm và thời lượng làm bài.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={save.isPending} className="space-y-6">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Tên đề thi
              <Input
                required
                minLength={2}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Thời lượng (phút)
              <Input
                type="number"
                min={1}
                max={1440}
                required
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Mô tả
              <textarea
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </Card>
          <div className="teacher-exam-editor">
            <section>
              <Card className="p-5">
                <h2 className="mb-4 text-lg font-semibold">Chọn câu hỏi</h2>
                <p className="muted mb-4">
                  Ngân hàng hiện tại · tối đa 200 câu. Thứ tự và điểm được lưu
                  trong bản nháp.
                </p>
                <Input
                  aria-label="Tìm câu hỏi để chọn"
                  maxLength={150}
                  value={questionSearch}
                  onChange={(event) => {
                    setQuestionSearch(event.target.value);
                    setQuestionPage(1);
                  }}
                  placeholder="Tìm câu hỏi..."
                />
                <div className="grid gap-3 my-3 sm:grid-cols-2">
                  <label>
                    Loại câu hỏi
                    <select
                      aria-label="Loại câu hỏi trong ngân hàng"
                      value={questionType}
                      onChange={(e) => {
                        setQuestionType(e.target.value);
                        setQuestionPage(1);
                      }}
                    >
                      <option value="">Tất cả loại</option>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Chủ đề
                    <Input
                      aria-label="Chủ đề trong ngân hàng"
                      maxLength={120}
                      placeholder="Nhập chủ đề"
                      value={questionTopic}
                      onChange={(e) => {
                        setQuestionTopic(e.target.value);
                        setQuestionPage(1);
                      }}
                    />
                  </label>
                  <label>
                    Độ khó
                    <select
                      aria-label="Độ khó trong ngân hàng"
                      value={questionDifficulty}
                      onChange={(e) => {
                        setQuestionDifficulty(e.target.value);
                        setQuestionPage(1);
                      }}
                    >
                      <option value="">Tất cả độ khó</option>
                      <option value="EASY">Dễ</option>
                      <option value="MEDIUM">Trung bình</option>
                      <option value="HARD">Khó</option>
                    </select>
                  </label>
                  <label>
                    Điểm cho câu chọn mới
                    <Input
                      aria-label="Điểm cho câu chọn mới"
                      type="number"
                      min="0.01"
                      max="999999.99"
                      step="0.01"
                      value={defaultPoints}
                      onChange={(e) => setDefaultPoints(e.target.value)}
                    />
                  </label>
                </div>
                <div className="admin-row-actions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      bank.isFetching ||
                      Boolean(questionsError) ||
                      !visibleQuestions.length
                    }
                    onClick={() =>
                      selectQuestions(
                        visibleQuestions.map((q) => q.id),
                        true,
                      )
                    }
                  >
                    Chọn trang này
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      bank.isFetching ||
                      !visibleQuestions.some((q) => order.includes(q.id))
                    }
                    onClick={() =>
                      selectQuestions(
                        visibleQuestions.map((q) => q.id),
                        false,
                      )
                    }
                  >
                    Bỏ chọn trang này
                  </Button>
                  <span role="status">
                    {bank.data?.total ?? 0} câu phù hợp · Đã chọn {order.length}
                    /200
                  </span>
                </div>
                {questionsPending ? (
                  <p className="text-slate-500">
                    Đang tải ngân hàng câu hỏi...
                  </p>
                ) : questionsError ? (
                  <p role="alert" className="text-red-600">
                    {questionsError}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void bank.refetch()}
                    >
                      Thử lại
                    </Button>
                  </p>
                ) : !visibleQuestions.length ? (
                  <p className="text-slate-500">
                    Không có câu hỏi phù hợp với bộ lọc hiện tại.{' '}
                    <Link
                      className="admin-secondary-link"
                      href="/teacher/questions"
                    >
                      Mở ngân hàng câu hỏi
                    </Link>
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleQuestions.map((question) => {
                      const selected = Object.hasOwn(points, question.id);
                      return (
                        <li
                          key={question.id}
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                        >
                          <label className="flex min-w-0 flex-1 items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                selectQuestions(
                                  [question.id],
                                  event.target.checked,
                                );
                              }}
                              className="mt-1 h-4 w-4 accent-blue-600"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium">
                                {question.content}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {typeLabels[question.type]}
                                {question.topic ? ` · ${question.topic}` : ''}
                              </span>
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPreviewId(question.id)}
                            aria-label={`Xem trước ${question.content}`}
                          >
                            Xem trước
                          </Button>
                          {selected && (
                            <label className="flex items-center gap-2 text-sm">
                              Điểm
                              <Input
                                type="number"
                                min="0.01"
                                max="999999.99"
                                step="0.01"
                                required
                                className="w-28"
                                value={points[question.id]}
                                onChange={(event) =>
                                  setPoints((current) => ({
                                    ...current,
                                    [question.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {previewId && (
                  <QuestionBankPreview
                    id={previewId}
                    onClose={() => setPreviewId('')}
                  />
                )}
              </Card>
              <Pagination
                page={bank.data?.page ?? questionPage}
                total={bank.data?.total ?? 0}
                pageCount={bank.data?.pageCount ?? 0}
                onPage={setQuestionPage}
                busy={bank.isFetching}
              />
            </section>
            <aside className="teacher-editor-summary" aria-label="Cấu trúc đề">
              <Card className="space-y-3 p-5">
                <h2 className="font-semibold">Thứ tự câu hỏi đã chọn</h2>
                <p role="status">
                  Tổng điểm:{' '}
                  {(
                    order.reduce(
                      (sum, id) =>
                        sum + Math.round((Number(points[id]) || 0) * 100),
                      0,
                    ) / 100
                  ).toFixed(2)}
                </p>
                <p className="muted">
                  {order.length} / 200 câu · {durationMin} phút
                </p>
                {order.map((id, index) => (
                  <div key={id} className="teacher-selection-row">
                    <span className="min-w-0 flex-1">
                      {index + 1}. {questionNames[id] ?? id}
                    </span>
                    <div>
                      <label>
                        Điểm câu {index + 1}
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={points[id]}
                          onChange={(event) =>
                            setPoints((current) => ({
                              ...current,
                              [id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Đưa câu ${index + 1} lên`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        Lên
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Đưa câu ${index + 1} xuống`}
                        disabled={index === order.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        Xuống
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Bỏ câu ${index + 1}`}
                        onClick={() => {
                          setOrder((current) =>
                            current.filter((questionId) => questionId !== id),
                          );
                          setPoints((current) => {
                            const next = { ...current };
                            delete next[id];
                            return next;
                          });
                        }}
                      >
                        Bỏ chọn
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </aside>
          </div>
          {notice && (
            <p role="alert" className="text-sm text-red-600">
              {notice}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/teacher/exams">
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={
                save.isPending || questionsPending || Boolean(questionsError)
              }
            >
              {save.isPending ? 'Đang lưu...' : 'Lưu bản nháp'}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

export function ExamPreview({
  examId,
  initialVersionId = '',
  listContext = readExamFilters({}),
}: {
  examId: string;
  initialVersionId?: string;
  listContext?: ExamFilters;
}) {
  const session = useTeacherAccess();
  const cache = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId);
  function selectVersion(id: string) {
    const verified = examPreviewHref(examId, id);
    const href = verified ? examContextHref(examId, listContext, id) : null;
    if (!href) return;
    setSelectedVersionId(id);
    window.history.replaceState(null, '', href);
  }
  const [confirmation, setConfirmation] = useState<ExamLifecycleAction | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  const exam = useQuery({
    queryKey: ['exam', examId, 'lean'],
    queryFn: () => api.exam(examId, 'versions=none'),
    enabled: session.data?.role === 'TEACHER',
  });
  const preview = useQuery({
    queryKey: ['exam-preview', examId, selectedVersionId],
    queryFn: () => api.examPreview(examId, selectedVersionId || undefined),
    enabled: session.data?.role === 'TEACHER',
  });
  const action = useMutation({
    mutationFn: (kind: 'publish' | 'version' | 'archive') =>
      kind === 'publish'
        ? api.publishExam(examId)
        : kind === 'version'
          ? api.newExamVersion(examId)
          : api.archiveExam(examId),
    onSuccess: async (_data, kind) => {
      selectVersion('');
      setNotice(
        kind === 'publish'
          ? 'Đã xuất bản. Chọn Giao bài để giao phiên bản này.'
          : kind === 'version'
            ? 'Đã tạo bản nháp mới. Chọn Chỉnh sửa để soạn tiếp.'
            : 'Đã lưu trữ đề thi.',
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['exam', examId] }),
        cache.invalidateQueries({ queryKey: ['exam-preview', examId] }),
        cache.invalidateQueries({ queryKey: ['exams'] }),
      ]);
    },
  });
  if (session.isPending || !session.data || exam.isPending || preview.isPending)
    return <div className="p-8 text-slate-500">Đang tải đề thi...</div>;
  if (exam.isError || preview.isError)
    return (
      <div className="teacher-page">
        <Link className="admin-secondary-link" href={examListHref(listContext)}>
          Danh sách đề theo bộ lọc
        </Link>
        <ErrorState
          error={(exam.error ?? preview.error)!}
          retry={() => {
            void exam.refetch();
            void preview.refetch();
          }}
        />
      </div>
    );
  const examData = exam.data as ExamRecord;
  const previewData = preview.data as ExamPreviewPayload;
  const snapshot = previewData.snapshot;
  const preparation = preparationSummary(
    snapshot.title,
    snapshot.durationMin,
    snapshot.questions,
  );
  const versionToAssign = previewData.examVersionId;
  const assignLink =
    versionToAssign && examData.status !== 'ARCHIVED'
      ? assignmentHref(examId, versionToAssign)
      : null;
  return (
    <div className="teacher-page">
      <Link className="admin-secondary-link" href={examListHref(listContext)}>
        Danh sách đề theo bộ lọc
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{snapshot.title}</h1>
          <p className="mt-2 text-slate-500">
            {selectedVersionId
              ? `Đã xuất bản · v${previewData.version}`
              : stateLabels[examData.status]}{' '}
            · {snapshot.durationMin} phút · {snapshot.questions.length} câu
          </p>
          {selectedVersionId && (
            <p className="muted">
              Trạng thái đề hiện tại: {stateLabels[examData.status]}. Bản đang
              xem được giữ nguyên theo lịch sử xuất bản.
            </p>
          )}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Thao tác đề thi"
        >
          {examData.status === 'DRAFT' && !selectedVersionId && (
            <>
              <Link href={`/teacher/exams/${examId}/edit`}>
                <Button type="button" variant="outline">
                  Chỉnh sửa
                </Button>
              </Link>
              <Button
                type="button"
                disabled={action.isPending}
                onClick={() => setConfirmation('publish')}
                aria-describedby="preparation-readiness"
              >
                Xuất bản
              </Button>
            </>
          )}
          {previewData.examVersionId && (
            <Link
              href={assignmentListHref(
                readAssignmentListFilters({
                  listExamId: examId,
                  listVersionId: previewData.examVersionId,
                }),
              )}
            >
              <Button variant="outline">Bài giao phiên bản này</Button>
            </Link>
          )}
          {assignLink && (
            <Link href={assignLink}>
              <Button type="button" variant="outline">
                {previewData.draft ? 'Giao phiên bản đã xuất bản' : 'Giao bài'}
              </Button>
            </Link>
          )}
          {examData.status === 'PUBLISHED' && !selectedVersionId && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={action.isPending}
                onClick={() => setConfirmation('version')}
              >
                Tạo phiên bản mới
              </Button>
            </>
          )}
          {examData.status !== 'ARCHIVED' && !selectedVersionId && (
            <Button
              type="button"
              variant="ghost"
              disabled={action.isPending}
              onClick={() => setConfirmation('archive')}
            >
              Lưu trữ
            </Button>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      {confirmation && (
        <ExamLifecycleDialog
          kind={confirmation}
          title={snapshot.title}
          onClose={() => setConfirmation(null)}
          onConfirm={async () => {
            await action.mutateAsync(confirmation);
          }}
        />
      )}
      {selectedVersionId && (
        <p className="teacher-summary-ribbon">
          Đang xem bản đã xuất bản v{previewData.version}. Không chỉnh sửa bản
          lịch sử.{' '}
          <Button
            type="button"
            variant="outline"
            onClick={() => selectVersion('')}
          >
            Về bản hiện tại
          </Button>
        </p>
      )}
      {action.error && (
        <p role="alert" className="text-red-600">
          {action.error.message}
        </p>
      )}
      <Card className="p-4 space-y-2" id="preparation-readiness">
        <h2>Kiểm tra cấu trúc trước khi tổ chức thi</h2>
        <p>
          {preparation.questionCount} câu · Tổng điểm{' '}
          {preparation.totalPoints ?? 'Chưa hợp lệ'} · {snapshot.durationMin}{' '}
          phút
        </p>
        <p>
          Chọn một: {preparation.types.SINGLE_CHOICE} · Chọn nhiều:{' '}
          {preparation.types.MULTIPLE_CHOICE} · Ghép nối:{' '}
          {preparation.types.MATCHING}
        </p>
        {preparation.blockers.length ? (
          <ul>
            {preparation.blockers.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p>
            Cấu hình hiển thị hợp lệ. Máy chủ vẫn kiểm tra lần cuối khi lưu/xuất
            bản. Xuất bản chưa tự giao bài.
          </p>
        )}
      </Card>
      <p className="teacher-summary-ribbon">
        {previewData.draft
          ? 'Bản nháp hiện tại — chưa giao cho học viên'
          : 'Phiên bản đã xuất bản — nội dung và điểm được đóng băng'}
      </p>
      <p className="muted">
        Tổng điểm cấu hình:{' '}
        {(
          snapshot.questions.reduce(
            (sum, question) => sum + Math.round(question.points * 100),
            0,
          ) / 100
        ).toFixed(2)}
      </p>
      <Card className="space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            Xem trước{' '}
            {previewData.draft
              ? 'bản nháp'
              : `phiên bản ${previewData.version}`}
          </h2>
          {snapshot.description && (
            <p className="mt-2 text-slate-500">{snapshot.description}</p>
          )}
        </div>
        {snapshot.questions.map((question, index) => (
          <article
            key={`${question.id}-${index}`}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div className="flex justify-between gap-4 text-sm text-slate-500">
              <span>Câu {index + 1}</span>
              <span>{question.points} điểm</span>
            </div>
            <h3 className="mt-2 font-semibold">{question.content}</h3>
            {question.type === 'MATCHING' ? (
              <ul className="mt-3 space-y-2 text-sm">
                {question.matchingPairs.map((pair) => (
                  <li key={pair.id}>
                    {pair.leftText} <span className="text-slate-400">↔</span>{' '}
                    {pair.rightText}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {question.options.map((option) => (
                  <li key={option.id}>
                    {option.isCorrect ? '✓ ' : '○ '}
                    {option.content}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Lịch sử phiên bản</h2>
        <ExamVersionPicker
          key={examId}
          examId={examId}
          value={selectedVersionId}
          onChange={selectVersion}
          history
        />
      </Card>
    </div>
  );
}
