'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { allPages } from '@/lib/all-pages';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/teacher/teacher-ui';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ExamState = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type Question = {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING';
  content: string;
  topic?: string | null;
};
type ExamSummary = {
  id: string;
  title: string;
  status: ExamState;
  durationMin: number;
  version: number;
  _count: { assignments: number; attempts: number };
};
type ExamRecord = ExamSummary & {
  description: string | null;
  questions: Array<{ questionId: string; points: number | string }>;
  versions: Array<{ id: string; number: number; publishedAt: string }>;
};
type ExamPreviewPayload = {
  draft: boolean;
  version?: number;
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

export function ExamList() {
  const session = useTeacherAccess();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');
  const query = new URLSearchParams({ page: String(page) });
  if (search.trim()) query.set('search', search.trim());
  if (status) query.set('status', status);
  const exams = useQuery({
    queryKey: ['exams', search, status, page],
    queryFn: () => api.exams(query.toString()),
    enabled: session.data?.role === 'TEACHER',
  });
  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: string }) => {
      if (kind === 'publish') return api.publishExam(id);
      if (kind === 'version') return api.newExamVersion(id);
      return api.archiveExam(id);
    },
    onSuccess: async () => {
      setNotice('Đã cập nhật đề thi.');
      await cache.invalidateQueries({ queryKey: ['exams'] });
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
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Lọc trạng thái đề thi"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
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
                    href={`/teacher/exams/${exam.id}`}
                    className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    {exam.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {stateLabels[exam.status as ExamState]} · {exam.durationMin}{' '}
                    phút · phiên bản {exam.version} · {exam._count.assignments}{' '}
                    lượt giao
                  </p>
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
                          action.mutate({ id: exam.id, kind: 'publish' })
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
                        action.mutate({ id: exam.id, kind: 'version' })
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
                        action.mutate({ id: exam.id, kind: 'archive' })
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
            onPage={setPage}
            busy={exams.isFetching}
          />
        )}
      </Card>
    </div>
  );
}

export function ExamEditor({ examId }: { examId?: string }) {
  const session = useTeacherAccess();
  const questions = useQuery({
    queryKey: ['questions', 'exam-editor'],
    queryFn: () =>
      allPages((page) =>
        api.questions(
          new URLSearchParams({ limit: '20', page: String(page) }).toString(),
        ),
      ),
    enabled: session.data?.role === 'TEACHER',
  });
  const exam = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => api.exam(examId!),
    enabled: Boolean(examId && session.data?.role === 'TEACHER'),
  });
  if (session.isPending || !session.data)
    return <div className="p-8 text-slate-500">Đang xác thực phiên...</div>;
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
      questions={questions.data as Question[] | undefined}
      questionsPending={questions.isPending}
      questionsError={questions.error?.message}
    />
  );
}

function ExamEditorForm({
  examId,
  initialExam,
  questions,
  questionsPending,
  questionsError,
}: {
  examId?: string;
  initialExam?: ExamRecord;
  questions?: Question[];
  questionsPending: boolean;
  questionsError?: string;
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
  const filteredQuestions = (questions ?? []).filter((q) =>
    q.content.toLowerCase().includes(questionSearch.toLowerCase()),
  );
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
        title,
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
    if (order.length < 1 || order.length > 200) {
      setNotice('Chọn từ 1 đến 200 câu hỏi trước khi lưu.');
      return;
    }
    const cents = order.map((id) => Number(points[id]) * 100);
    if (
      cents.some(
        (v) =>
          !Number.isFinite(v) ||
          v <= 0 ||
          Math.abs(v - Math.round(v)) > 1e-7 ||
          v > 99999999,
      ) ||
      cents.reduce((a, b) => a + Math.round(b), 0) > 99999999
    ) {
      setNotice(
        'Điểm phải lớn hơn 0, tối đa hai chữ số thập phân và tổng không vượt 999999.99.',
      );
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
                  value={questionSearch}
                  onChange={(event) => {
                    setQuestionSearch(event.target.value);
                    setQuestionPage(1);
                  }}
                  placeholder="Tìm câu hỏi..."
                />
                {questionsPending ? (
                  <p className="text-slate-500">
                    Đang tải ngân hàng câu hỏi...
                  </p>
                ) : questionsError ? (
                  <p role="alert" className="text-red-600">
                    {questionsError}
                  </p>
                ) : !questions?.length ? (
                  <p className="text-slate-500">
                    Ngân hàng chưa có câu hỏi. Hãy tạo câu hỏi trước khi soạn
                    đề.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredQuestions
                      .slice((questionPage - 1) * 20, questionPage * 20)
                      .map((question) => {
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
                                  const checked = event.target.checked;
                                  setOrder((current) =>
                                    checked
                                      ? [...current, question.id]
                                      : current.filter(
                                          (id) => id !== question.id,
                                        ),
                                  );
                                  setPoints((current) => {
                                    const next = { ...current };
                                    if (event.target.checked)
                                      next[question.id] = '1';
                                    else delete next[question.id];
                                    return next;
                                  });
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
              </Card>
              <Pagination
                page={questionPage}
                total={filteredQuestions.length}
                pageCount={Math.ceil(filteredQuestions.length / 20)}
                onPage={setQuestionPage}
                busy={questionsPending}
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
                      {index + 1}.{' '}
                      {questions?.find((q) => q.id === id)?.content ?? id}
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

export function ExamPreview({ examId }: { examId: string }) {
  const router = useRouter();
  const session = useTeacherAccess();
  const cache = useQueryClient();
  const exam = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => api.exam(examId),
    enabled: session.data?.role === 'TEACHER',
  });
  const preview = useQuery({
    queryKey: ['exam-preview', examId],
    queryFn: () => api.examPreview(examId),
    enabled: session.data?.role === 'TEACHER',
  });
  const action = useMutation({
    mutationFn: (kind: 'publish' | 'version' | 'archive') =>
      kind === 'publish'
        ? api.publishExam(examId)
        : kind === 'version'
          ? api.newExamVersion(examId)
          : api.archiveExam(examId),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['exam', examId] }),
        cache.invalidateQueries({ queryKey: ['exam-preview', examId] }),
        cache.invalidateQueries({ queryKey: ['exams'] }),
      ]);
      router.refresh();
    },
  });
  if (session.isPending || !session.data || exam.isPending || preview.isPending)
    return <div className="p-8 text-slate-500">Đang tải đề thi...</div>;
  if (exam.isError || preview.isError)
    return (
      <div className="teacher-page">
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
  return (
    <div className="teacher-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{examData.title}</h1>
          <p className="mt-2 text-slate-500">
            {stateLabels[examData.status]} · {snapshot.durationMin} phút ·{' '}
            {snapshot.questions.length} câu
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {examData.status === 'DRAFT' && (
            <>
              <Link href={`/teacher/exams/${examId}/edit`}>
                <Button type="button" variant="outline">
                  Chỉnh sửa
                </Button>
              </Link>
              <Button
                type="button"
                disabled={action.isPending}
                onClick={() => action.mutate('publish')}
              >
                Xuất bản
              </Button>
            </>
          )}
          {examData.status === 'PUBLISHED' && (
            <>
              <Link href="/teacher/assignments">
                <Button type="button" variant="outline">
                  Giao bài
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                disabled={action.isPending}
                onClick={() => action.mutate('version')}
              >
                Tạo phiên bản mới
              </Button>
            </>
          )}
          {examData.status !== 'ARCHIVED' && (
            <Button
              type="button"
              variant="ghost"
              disabled={action.isPending}
              onClick={() => action.mutate('archive')}
            >
              Lưu trữ
            </Button>
          )}
        </div>
      </header>
      {action.error && (
        <p role="alert" className="text-red-600">
          {action.error.message}
        </p>
      )}
      <p className="teacher-summary-ribbon">
        {previewData.draft
          ? 'Bản nháp hiện tại — chưa giao cho học viên'
          : 'Phiên bản đã xuất bản — nội dung và điểm được đóng băng'}
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
      {examData.versions.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Lịch sử phiên bản</h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {examData.versions.map((version) => (
              <li key={version.id}>
                Phiên bản {version.number} ·{' '}
                {new Date(version.publishedAt).toLocaleString('vi-VN')}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
