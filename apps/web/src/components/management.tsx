/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type Kind = 'users' | 'classes' | 'questions';
const headings = {
  users: 'Quản lý người dùng',
  classes: 'Quản lý lớp học',
  questions: 'Ngân hàng câu hỏi',
};
export function Management({ kind }: { kind: Kind }) {
  const router = useRouter();
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  useEffect(() => {
    if (me.isError) router.replace('/login');
    if (me.data) {
      const needed =
        kind === 'users' ? 'ADMIN' : kind === 'questions' ? 'TEACHER' : null;
      if (needed && me.data.role !== needed)
        router.replace(`/dashboard/${me.data.role.toLowerCase()}`);
    }
  }, [me.data, me.isError, kind, router]);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: [kind, search, page],
    enabled: !!me.data,
    queryFn: () =>
      kind === 'users'
        ? api.users(
            new URLSearchParams({ search, page: String(page) }).toString(),
          )
        : kind === 'classes'
          ? api.classes()
          : api.questions(
              new URLSearchParams({ search, page: String(page) }).toString(),
            ),
  });
  const mutate = useMutation({
    mutationFn: async (v: any) => {
      if (kind === 'users') return api.createUser(v);
      if (kind === 'classes') return api.createClass(v);
      return api.createQuestion(v);
    },
    onSuccess: () => {
      setNotice('Đã lưu thành công');
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: Error) => setNotice(e.message),
  });
  if (me.isPending || !me.data)
    return <main className="p-8 text-slate-500">Đang xác thực phiên...</main>;
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-blue-600">ExamSpace</p>
        <h1 className="mt-2 text-3xl font-bold">{headings[kind]}</h1>
        <p className="mt-2 text-slate-500">Dữ liệu được đọc và ghi qua API.</p>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
        >
          {notice}
        </p>
      )}
      {(kind !== 'classes' || me.data.role === 'ADMIN') && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {kind === 'users'
              ? 'Tạo tài khoản'
              : kind === 'classes'
                ? 'Tạo lớp học'
                : 'Tạo câu hỏi'}
          </h2>
          {kind === 'users' ? (
            <UserForm onSubmit={(v) => mutate.mutate(v)} />
          ) : kind === 'classes' ? (
            <ClassForm onSubmit={(v) => mutate.mutate(v)} />
          ) : (
            <QuestionForm onSubmit={(v) => mutate.mutate(v)} />
          )}
        </Card>
      )}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Danh sách</h2>
          <Input
            className="max-w-sm"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {query.isLoading ? (
          <p className="p-6 text-slate-500">Đang tải...</p>
        ) : query.error ? (
          <p role="alert" className="p-6 text-red-600">
            {(query.error as Error).message}
          </p>
        ) : kind === 'users' ? (
          <UsersTable data={query.data as any} onNotice={setNotice} />
        ) : kind === 'classes' ? (
          <ClassesTable data={query.data as any} onNotice={setNotice} />
        ) : (
          <QuestionsTable data={query.data as any} onNotice={setNotice} />
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="px-3 py-2 text-sm">
            Trang {page} / {(query.data as any)?.pageCount || 1}
          </span>
          <Button
            variant="outline"
            disabled={page >= ((query.data as any)?.pageCount || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      </Card>
    </main>
  );
}
function UserForm({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [email, setEmail] = useState(''),
    [fullName, setName] = useState(''),
    [role, setRole] = useState('STUDENT'),
    [password, setPassword] = useState('');
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ email, fullName, role, password });
        setPassword('');
      }}
    >
      <Input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        required
        placeholder="Họ và tên"
        value={fullName}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="h-11 rounded-lg border px-3 dark:bg-slate-900"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="STUDENT">Học viên</option>
        <option value="TEACHER">Giảng viên</option>
      </select>
      <Input
        required
        minLength={12}
        type="password"
        placeholder="Mật khẩu tạm (ít nhất 12 ký tự)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button className="sm:col-span-2">Tạo tài khoản</Button>
    </form>
  );
}
function ClassForm({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [teacherId, setTeacher] = useState('');
  const teachers = useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: () => api.users('role=TEACHER&limit=100'),
  });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, code, teacherId });
      }}
    >
      <Input
        required
        placeholder="Tên lớp"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        required
        placeholder="Mã lớp"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <select
        required
        className="h-11 rounded-lg border px-3 dark:bg-slate-900"
        value={teacherId}
        onChange={(e) => setTeacher(e.target.value)}
      >
        <option value="">Chọn giảng viên</option>
        {(teachers.data?.items || []).map((u: any) => (
          <option key={u.id} value={u.id}>
            {u.fullName} ({u.email})
          </option>
        ))}
      </select>
      <Button>Tạo lớp</Button>
    </form>
  );
}
function QuestionForm({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [type, setType] = useState('SINGLE_CHOICE'),
    [content, setContent] = useState(''),
    [topic, setTopic] = useState(''),
    [difficulty, setDifficulty] = useState('MEDIUM'),
    [options, setOptions] = useState([
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
    ]),
    [pairs, setPairs] = useState([
      { leftText: '', rightText: '' },
      { leftText: '', rightText: '' },
    ]);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          type,
          content,
          topic,
          difficulty,
          ...(type === 'MATCHING' ? { matchingPairs: pairs } : { options }),
        });
      }}
    >
      <textarea
        required
        className="min-h-24 w-full rounded-lg border p-3 dark:bg-slate-900"
        placeholder="Nội dung câu hỏi"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded border px-3 dark:bg-slate-900"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="SINGLE_CHOICE">Một đáp án</option>
          <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
          <option value="MATCHING">Ghép nối</option>
        </select>
        <select
          className="h-10 rounded border px-3 dark:bg-slate-900"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="EASY">Dễ</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Khó</option>
        </select>
        <Input
          className="max-w-xs"
          placeholder="Chủ đề"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>
      {type === 'MATCHING'
        ? pairs.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Input
                placeholder={`Vế trái ${i + 1}`}
                value={p.leftText}
                onChange={(e) =>
                  setPairs((a) =>
                    a.map((x, j) =>
                      j === i ? { ...x, leftText: e.target.value } : x,
                    ),
                  )
                }
              />
              <Input
                placeholder={`Vế phải ${i + 1}`}
                value={p.rightText}
                onChange={(e) =>
                  setPairs((a) =>
                    a.map((x, j) =>
                      j === i ? { ...x, rightText: e.target.value } : x,
                    ),
                  )
                }
              />
            </div>
          ))
        : options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input
                required
                placeholder={`Lựa chọn ${i + 1}`}
                value={o.content}
                onChange={(e) =>
                  setOptions((a) =>
                    a.map((x, j) =>
                      j === i ? { ...x, content: e.target.value } : x,
                    ),
                  )
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type={type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                  name="correct"
                  checked={o.isCorrect}
                  onChange={() =>
                    setOptions((a) =>
                      a.map((x, j) => ({
                        ...x,
                        isCorrect:
                          type === 'SINGLE_CHOICE'
                            ? j === i
                            : j === i
                              ? !x.isCorrect
                              : x.isCorrect,
                      })),
                    )
                  }
                />{' '}
                Đúng
              </label>
            </div>
          ))}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            type === 'MATCHING'
              ? setPairs((p) => [...p, { leftText: '', rightText: '' }])
              : setOptions((o) => [...o, { content: '', isCorrect: false }])
          }
        >
          Thêm dòng
        </Button>
        <Button>Lưu câu hỏi</Button>
      </div>
    </form>
  );
}
function UsersTable({
  data,
  onNotice,
}: {
  data: any;
  onNotice: (s: string) => void;
}) {
  const qc = useQueryClient();
  if (!data?.items?.length)
    return <p className="p-6 text-slate-500">Chưa có người dùng.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-slate-500">
            <th className="p-3">Tên</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((u: any) => (
            <tr className="border-b dark:border-slate-800" key={u.id}>
              <td className="p-3">{u.fullName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
              <td className="flex gap-2 py-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await api.setUserStatus(u.id, !u.isActive);
                    qc.invalidateQueries({ queryKey: ['users'] });
                  }}
                >
                  {u.isActive ? 'Khóa' : 'Mở khóa'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const r = await api.resetUserPassword(u.id);
                    onNotice(`Mật khẩu tạm: ${r.temporaryPassword}`);
                  }}
                >
                  Đặt lại mật khẩu
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ClassesTable({
  data,
  onNotice,
}: {
  data: any;
  onNotice: (s: string) => void;
}) {
  const [chosen, setChosen] = useState(''),
    [student, setStudent] = useState('');
  const detail = useQuery({
    queryKey: ['class', chosen],
    queryFn: () => api.classDetail(chosen),
    enabled: !!chosen,
  });
  const qc = useQueryClient();
  return (
    <div className="space-y-4">
      {!data?.items?.length ? (
        <p className="p-6 text-slate-500">Chưa có lớp học.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.items.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setChosen(c.id)}
              className="rounded-xl border p-4 text-left hover:border-blue-400"
            >
              <b>{c.name}</b>
              <p className="text-sm text-slate-500">
                {c.code} · {c.teacher?.fullName} ·{' '}
                {c._count?.members ?? c.members?.length ?? 0} học viên
              </p>
            </button>
          ))}
        </div>
      )}
      {chosen && (
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">Thành viên {detail.data?.name}</h3>
          <div className="my-3 flex gap-2">
            <Input
              placeholder="ID học viên"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            />
            <Button
              onClick={async () => {
                try {
                  await api.addStudent(chosen, student);
                  setStudent('');
                  qc.invalidateQueries({ queryKey: ['class', chosen] });
                  qc.invalidateQueries({ queryKey: ['classes'] });
                } catch (e) {
                  onNotice((e as Error).message);
                }
              }}
            >
              Thêm
            </Button>
          </div>
          {(detail.data?.members || []).map((m: any) => (
            <div className="flex justify-between border-t py-2" key={m.id}>
              {m.student.fullName} ({m.student.email})
              <button
                className="text-red-600"
                onClick={async () => {
                  await api.removeStudent(chosen, m.studentId);
                  qc.invalidateQueries({ queryKey: ['class', chosen] });
                }}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function QuestionsTable({
  data,
  onNotice,
}: {
  data: any;
  onNotice: (s: string) => void;
}) {
  const qc = useQueryClient();
  if (!data?.items?.length)
    return <p className="p-6 text-slate-500">Chưa có câu hỏi.</p>;
  return (
    <div className="space-y-3">
      {data.items.map((q: any) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          key={q.id}
        >
          <div>
            <b>{q.content}</b>
            <p className="text-sm text-slate-500">
              {q.type} · {q.difficulty} · {q.topic || 'Chưa phân chủ đề'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await api.duplicateQuestion(q.id);
                qc.invalidateQueries({ queryKey: ['questions'] });
              }}
            >
              Nhân bản
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await api.archiveQuestion(q.id);
                qc.invalidateQueries({ queryKey: ['questions'] });
                onNotice('Đã lưu trữ câu hỏi');
              }}
            >
              Lưu trữ
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
