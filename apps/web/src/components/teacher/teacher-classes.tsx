'use client';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import {
  TeacherHeading,
  ErrorState,
  EmptyState,
  DataTable,
  ConfirmationDialog,
  useTeacherAction,
} from './teacher-ui';
import { ManagementDetail } from '@/components/management-detail';
export function TeacherClasses() {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [chosen, setChosen] = useState('');
  const list = useQuery({
    queryKey: ['teacher-classes', search, page],
    queryFn: () =>
      api.classes(
        new URLSearchParams({ search, page: String(page) }).toString(),
      ),
  });
  return (
    <div className="teacher-page">
      <TeacherHeading
        title="Quản lý lớp học"
        description="Các lớp được phân công cho bạn. Mở một lớp để chỉnh sửa thông tin và quản lý thành viên."
      />
      <Card className="teacher-panel">
        <div className="admin-toolbar">
          <label>
            Tìm kiếm
            <Input
              aria-label="Tìm kiếm"
              placeholder="Tìm kiếm..."
              maxLength={150}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        {list.isPending ? (
          <p role="status">Đang tải lớp học...</p>
        ) : list.isError ? (
          <ErrorState error={list.error} retry={() => void list.refetch()} />
        ) : !list.data.items.length ? (
          <EmptyState title="Chưa có lớp học.">
            Lớp học do quản trị viên phân công.
          </EmptyState>
        ) : (
          <div className="teacher-collection">
            {list.data.items.map((c) => (
              <button
                key={c.id}
                className="teacher-question-row text-left"
                onClick={() => setChosen(c.id)}
              >
                <div>
                  <h2>{c.name}</h2>
                  <p>
                    {c.code} · {c.teacher?.fullName} · {c._count.members} học
                    viên
                  </p>
                </div>
                <span className="admin-badge admin-badge-primary">
                  Mở lớp →
                </span>
              </button>
            ))}
          </div>
        )}
        {list.data && !list.isError && (
          <Pagination
            page={page}
            total={list.data.total}
            pageCount={list.data.pageCount}
            busy={list.isFetching}
            onPage={setPage}
          />
        )}
      </Card>
      {chosen && (
        <TeacherClassDetail
          key={chosen}
          id={chosen}
          onClose={() => setChosen('')}
        />
      )}
    </div>
  );
}
function TeacherClassDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ['teacher-class', id],
    queryFn: () => api.classDetail(id),
    gcTime: 0,
    retry: false,
  });
  const [student, setStudent] = useState(''),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [remove, setRemove] = useState<{ id: string; name: string } | null>(null);
  const picker = useQuery({
    queryKey: ['teacher-member-options', search, page],
    queryFn: () =>
      api.users(
        new URLSearchParams({
          role: 'STUDENT',
          active: 'true',
          search,
          page: String(page),
        }).toString(),
      ),
  });
  const cache = useQueryClient(),
    action = useTeacherAction();
  async function refresh() {
    await cache.invalidateQueries();
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    await action.run(async () => {
      await api.addStudent(id, student);
      setStudent('');
      await refresh();
    });
  }
  return (
    <Card className="teacher-panel">
      <div className="admin-section-title">
        <h2>Chi tiết lớp học</h2>
        <Button type="button" variant="ghost" onClick={onClose}>
          Đóng chi tiết
        </Button>
      </div>
      {q.isPending ? (
        <p role="status">Đang tải chi tiết...</p>
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <ManagementDetail kind="classes" id={id} />
          <section className="admin-roster">
            <h3>Thành viên {q.data.name}</h3>
            <form
              onSubmit={(e) => void add(e)}
              className="admin-student-picker"
            >
              <p className="muted">
                Chọn học viên đang quản lý hoặc nhập UUID học viên được cấp để
                thêm vào lớp.
              </p>
              <div className="teacher-form-grid">
                <label>
                  Tìm học viên
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  Học viên đang quản lý
                  <select
                    value=""
                    onChange={(e) => setStudent(e.target.value)}
                    disabled={picker.isPending || picker.isError}
                  >
                    <option value="">Chọn học viên</option>
                    {picker.data?.items.map((u) => (
                      <option key={String(u.id)} value={String(u.id)}>
                        {String(u.fullName)} ({String(u.email)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  ID học viên
                  <Input
                    placeholder="ID học viên"
                    value={student}
                    required
                    pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                    onChange={(e) => setStudent(e.target.value)}
                  />
                </label>
                <Button disabled={action.pending || q.isFetching} type="submit">
                  Thêm
                </Button>
              </div>
              {picker.isError && (
                <ErrorState
                  error={picker.error}
                  retry={() => void picker.refetch()}
                />
              )}
              <div className="admin-picker-pagination">
                <span>
                  Trang {page} / {Math.max(1, picker.data?.pageCount ?? 1)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || picker.isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  Học viên trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    !picker.data ||
                    page >= picker.data.pageCount ||
                    picker.isFetching
                  }
                  onClick={() => setPage(page + 1)}
                >
                  Học viên sau
                </Button>
              </div>
            </form>
            {action.error && <ErrorState error={action.error} />}
            <DataTable label="Thành viên lớp">
              <thead>
                <tr>
                  <th scope="col">Học viên</th>
                  <th scope="col">Email</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {q.data.members.map(
                  (m: {
                    id: string;
                    studentId: string;
                    student: { fullName: string; email: string };
                  }) => (
                    <tr key={m.id}>
                      <th scope="row">{m.student.fullName}</th>
                      <td>{m.student.email}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setRemove({
                              id: m.studentId,
                              name: m.student.fullName,
                            })
                          }
                        >
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </DataTable>
            {!q.data.members.length && (
              <EmptyState title="Lớp chưa có học viên." />
            )}
          </section>
        </>
      )}
      {remove && (
        <ConfirmationDialog
          title="Xóa học viên khỏi lớp?"
          description={
            'Học viên ' +
            remove.name +
            ' sẽ không còn là thành viên lớp này. Lịch sử bài đã hoàn thành được giữ theo chính sách backend.'
          }
          actionLabel="Xóa học viên"
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await api.removeStudent(id, remove.id);
            await refresh();
          }}
        />
      )}
    </Card>
  );
}
