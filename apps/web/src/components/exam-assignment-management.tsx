'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ExamAssignment } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { allPages } from '@/lib/all-pages';
import { Pagination } from '@/components/pagination';

type ClassOption = { id: string; name: string; code: string };
type StudentOption = { id: string; fullName: string; email: string };

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

export function ExamAssignmentManagement() {
  const session = useTeacherSession();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const assignments = useQuery({
    queryKey: ['exam-assignments', page, search],
    queryFn: () =>
      api.examAssignments(`page=${page}&search=${encodeURIComponent(search)}`),
    enabled: ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
  });
  const exams = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => allPages((page) => api.exams(`page=${page}`)),
    enabled: ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
  });
  const classes = useQuery({
    queryKey: ['classes'],
    queryFn: () => allPages((page) => api.classes(`page=${page}`)),
    enabled: ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
  });
  const students = useQuery({
    queryKey: ['users', 'students'],
    queryFn: () =>
      allPages((page) =>
        api.users(`role=STUDENT&active=true&limit=20&page=${page}`),
      ),
    enabled: ['TEACHER', 'ADMIN'].includes(session.data?.role ?? ''),
  });
  const [targetKind, setTargetKind] = useState<'class' | 'student'>('class');
  const [examId, setExamId] = useState('');
  const [examVersionId, setExamVersionId] = useState('');
  const versions = useQuery({
    queryKey: ['exam-versions', examId],
    queryFn: () => api.examVersions(examId),
    enabled: Boolean(examId),
  });
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [showScore, setShowScore] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const recipients = useQuery({
    queryKey: ['exam-assignment-students', selectedAssignment],
    queryFn: () => api.examAssignmentStudents(selectedAssignment),
    enabled: Boolean(selectedAssignment),
  });
  const create = useMutation({
    mutationFn: api.createExamAssignment,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['exam-assignments'] });
      setExamId('');
      setOpensAt('');
      setClosesAt('');
      setShowScore(false);
      setShowAnswers(false);
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedTarget = targetKind === 'class' ? { classId } : { studentId };
    create.mutate({
      examId,
      ...(examVersionId ? { examVersionId } : {}),
      ...selectedTarget,
      opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      maxAttempts: Number(maxAttempts),
      showScore,
      showAnswers,
    });
  }

  if (session.isPending || !session.data)
    return <main className="p-8 text-slate-500">Đang tải...</main>;
  const examOptions = (exams.data ?? []).filter(
    (exam) => exam.status !== 'ARCHIVED' && exam.versions?.length > 0,
  ) as Array<{
    id: string;
    title: string;
  }>;
  const classOptions = (classes.data ?? []) as ClassOption[];
  const studentOptions = (students.data ?? []) as StudentOption[];
  const assignmentItems = assignments.data?.items ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">Giảng viên</p>
        <h1 className="mt-1 text-3xl font-bold">Giao bài kiểm tra</h1>
        <p className="mt-2 text-slate-500">
          Chọn đề đã xuất bản, người nhận và thời gian làm bài.
        </p>
      </div>

      <Input
        aria-label="Tìm kiếm"
        placeholder="Tìm kiếm..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Đề thi
            <select
              required
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setExamVersionId('');
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Chọn đề đã xuất bản</option>
              {examOptions.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Phiên bản đề thi
            <select
              aria-label="Phiên bản đề thi"
              value={examVersionId}
              onChange={(event) => setExamVersionId(event.target.value)}
              disabled={!examId || versions.isPending}
              className="h-10 rounded-md border bg-white px-3 dark:bg-slate-900"
            >
              <option value="">Mới nhất đã xuất bản</option>
              {(versions.data ?? []).map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.number} · {localDateTime(version.publishedAt)}
                </option>
              ))}
            </select>
            {versions.error && (
              <span role="alert" className="text-red-600">
                {versions.error.message}
              </span>
            )}
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Giao cho
            <select
              value={targetKind}
              onChange={(event) =>
                setTargetKind(event.target.value as 'class' | 'student')
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="class">Cả lớp</option>
              <option value="student">Một học viên</option>
            </select>
          </label>
          {targetKind === 'class' ? (
            <label className="grid gap-1 text-sm font-medium">
              Lớp học
              <select
                required
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Chọn lớp</option>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid gap-1 text-sm font-medium">
              Học viên trong lớp bạn quản lý
              <select
                required
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Chọn học viên</option>
                {studentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName} — {item.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium">
            Mở bài
            <Input
              type="datetime-local"
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Đóng bài
            <Input
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Số lượt làm tối đa
            <Input
              type="number"
              min="1"
              max="20"
              required
              value={maxAttempts}
              onChange={(event) => setMaxAttempts(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-3 self-end text-sm md:col-span-2 sm:flex-row">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showScore}
                onChange={(event) => setShowScore(event.target.checked)}
              />
              Công bố điểm sau khi nộp
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(event) => setShowAnswers(event.target.checked)}
              />
              Công bố đáp án sau khi nộp
            </label>
            <Button
              type="submit"
              className="sm:ml-auto"
              disabled={create.isPending || !examOptions.length}
            >
              {create.isPending ? 'Đang giao...' : 'Giao bài'}
            </Button>
          </div>
          {create.error && (
            <p role="alert" className="text-sm text-red-600 md:col-span-2">
              {create.error.message}
            </p>
          )}
          {create.isSuccess && (
            <p className="text-sm text-emerald-600 md:col-span-2">
              Đã giao bài kiểm tra.
            </p>
          )}
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Bài đã giao</h2>
        {assignments.isPending && (
          <p role="status">Đang tải danh sách bài giao...</p>
        )}
        {assignments.isError && (
          <p role="alert" className="text-sm text-red-600">
            {assignments.error.message}
          </p>
        )}
        {assignmentItems.map((item: ExamAssignment) => (
          <Card key={item.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.exam.title}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {item.class?.name ?? item.student?.fullName ?? 'Người nhận'}
                  {' · '}Phiên bản {item.examVersion?.number ?? '—'}
                  {' · '}
                  {item._count.attempts} lượt đã bắt đầu
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mở: {localDateTime(item.opensAt)} · Đóng:{' '}
                  {localDateTime(item.closesAt)} · Tối đa {item.maxAttempts}{' '}
                  lượt
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSelectedAssignment((current) =>
                      current === item.id ? '' : item.id,
                    )
                  }
                >
                  {selectedAssignment === item.id ? 'Ẩn học viên' : 'Học viên'}
                </Button>
                <Link href={`/teacher/exams/${item.examId}/results`}>
                  <Button type="button" variant="outline">
                    Kết quả
                  </Button>
                </Link>
              </div>
            </div>
            {selectedAssignment === item.id && (
              <div className="mt-4 overflow-x-auto border-t pt-4">
                {recipients.isPending ? (
                  <p className="text-sm text-slate-500">Đang tải học viên...</p>
                ) : recipients.isError ? (
                  <p role="alert" className="text-sm text-red-600">
                    {recipients.error.message}
                  </p>
                ) : (
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2">Học viên</th>
                        <th>Trạng thái</th>
                        <th>Lần làm gần nhất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recipients.data ?? []).map((student) => {
                        const latest = student.attempts[0];
                        return (
                          <tr key={student.id} className="border-t">
                            <td className="py-2">
                              {student.fullName}
                              <span className="block text-xs text-slate-500">
                                {student.email}
                              </span>
                            </td>
                            <td>{latest?.status ?? 'Chưa bắt đầu'}</td>
                            <td>
                              {latest?.submittedAt
                                ? localDateTime(latest.submittedAt)
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Card>
        ))}
        {!assignments.isPending && assignmentItems.length === 0 && (
          <Card className="p-6 text-sm text-slate-500">
            Chưa có bài kiểm tra được giao.
          </Card>
        )}
        {assignments.data && (
          <Pagination
            page={page}
            total={assignments.data.total}
            pageCount={assignments.data.pageCount}
            onPage={setPage}
            busy={assignments.isFetching}
          />
        )}
      </section>
    </main>
  );
}
