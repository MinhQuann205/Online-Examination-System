'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { allPages } from '@/lib/all-pages';
import { QuestionForm, type FormQuestion } from '@/components/question-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type Kind = 'users' | 'classes' | 'questions';
type Detail = Partial<FormQuestion> & {
  id: string;
  updatedAt: string;
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  name?: string;
  code?: string;
  description?: string | null;
  teacherId?: string;
  teacher?: { fullName: string };
  authorId?: string;
};

export function ManagementDetail({ kind, id }: { kind: Kind; id: string }) {
  const session = useQuery({ queryKey: ['me'], queryFn: api.me });
  const detail = useQuery({
    queryKey: ['management-detail', kind, id],
    queryFn: async () =>
      (kind === 'users'
        ? api.user(id)
        : kind === 'classes'
          ? api.classDetail(id)
          : api.question(id)) as Promise<Detail>,
  });
  if (detail.isPending) return <p role="status">Đang tải chi tiết...</p>;
  if (detail.isError)
    return (
      <p role="alert" className="text-red-600">
        {detail.error.message}
      </p>
    );
  const actor = session.data;
  const editable = Boolean(
    actor &&
    (kind === 'users'
      ? actor.role === 'ADMIN'
      : kind === 'classes'
        ? actor.role === 'ADMIN' || detail.data.teacherId === actor.id
        : actor.role === 'TEACHER' && detail.data.authorId === actor.id),
  );
  return (
    <DetailEditor
      key={`${kind}:${id}:${detail.data.updatedAt}`}
      kind={kind}
      data={detail.data}
      editable={editable}
      admin={actor?.role === 'ADMIN'}
    />
  );
}

function DetailEditor({
  kind,
  data,
  editable,
  admin,
}: {
  kind: Kind;
  data: Detail;
  editable: boolean;
  admin: boolean;
}) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.fullName ?? data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [teacherId, setTeacherId] = useState(data.teacherId ?? '');
  const teachers = useQuery({
    queryKey: ['teacher-options'],
    queryFn: () =>
      allPages((page) => api.users(`role=TEACHER&limit=20&page=${page}`)),
    enabled: kind === 'classes' && admin && editing,
  });
  const save = useMutation({
    mutationFn: (body: unknown) =>
      kind === 'users'
        ? api.updateUser(data.id, body)
        : kind === 'classes'
          ? api.updateClass(data.id, body)
          : api.updateQuestion(data.id, body),
    onSuccess: async () => {
      setEditing(false);
      await cache.invalidateQueries();
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(
      kind === 'users'
        ? { fullName: name, email }
        : { name, description, ...(admin ? { teacherId } : {}) },
    );
  };
  return (
    <Card
      className="space-y-4 border-blue-300 p-5"
      aria-label="Chi tiết quản lý"
    >
      <h3 className="font-semibold">
        Chi tiết{' '}
        {kind === 'users'
          ? 'tài khoản'
          : kind === 'classes'
            ? 'lớp học'
            : 'câu hỏi'}
      </h3>
      {kind === 'users' ? (
        <p>
          {data.fullName} · {data.email} · {data.role} ·{' '}
          {data.isActive ? 'Hoạt động' : 'Đã khóa'}
        </p>
      ) : kind === 'classes' ? (
        <p>
          {data.name} · {data.code} · {data.teacher?.fullName}
          <br />
          {data.description}
        </p>
      ) : (
        <div aria-label="Xem trước câu hỏi" className="space-y-2">
          <p>
            {data.content} · {data.type} · {data.difficulty} · {data.topic}
          </p>
          <ul>
            {data.options?.map((option, index) => (
              <li key={index}>
                {option.content}
                {option.isCorrect ? ' ✓' : ''}
              </li>
            ))}
          </ul>
          <ul>
            {data.matchingPairs?.map((pair, index) => (
              <li key={index}>
                {pair.leftText} → {pair.rightText}
              </li>
            ))}
          </ul>
          {data.explanation && <p>Giải thích: {data.explanation}</p>}
        </div>
      )}
      {editable && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing((current) => !current)}
        >
          {editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
        </Button>
      )}
      {editing &&
        (kind === 'questions' ? (
          <fieldset disabled={save.isPending}>
            <QuestionForm
              initial={data as FormQuestion}
              onSubmit={(body) => save.mutate(body)}
            />
          </fieldset>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <label>
              {kind === 'users' ? 'Họ và tên' : 'Tên lớp'}
              <Input
                required
                minLength={2}
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            {kind === 'users' ? (
              <label>
                Email
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : (
              <>
                <label>
                  Mô tả lớp
                  <Input
                    value={description}
                    maxLength={2000}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
                {admin && (
                  <label>
                    Giảng viên phụ trách
                    <select
                      aria-label="Giảng viên phụ trách"
                      value={teacherId}
                      onChange={(event) => setTeacherId(event.target.value)}
                      className="h-11 w-full rounded-md border dark:bg-slate-900"
                    >
                      <option value={data.teacherId}>
                        {data.teacher?.fullName}
                      </option>
                      {teachers.data
                        ?.filter((teacher) => teacher.id !== data.teacherId)
                        .map((teacher) => (
                          <option
                            key={String(teacher.id)}
                            value={String(teacher.id)}
                          >
                            {String(teacher.fullName)}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <Button type="submit" disabled={save.isPending}>
              Lưu thay đổi
            </Button>
          </form>
        ))}
      {save.error && (
        <p role="alert" className="text-red-600">
          {save.error.message}
        </p>
      )}
      {save.isSuccess && <p role="status">Đã lưu thay đổi.</p>}
    </Card>
  );
}
