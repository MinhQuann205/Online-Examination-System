'use client';
import { BackButton } from '@/components/back-navigation';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { allPages } from '@/lib/all-pages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import {
  AdminPageHeader,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  ErrorState,
  SearchToolbar,
  StatusBadge,
  useAdminAction,
} from './admin-ui';
import {
  loadClass,
  loadClasses,
  loadUsers,
  type AdminClass,
  type AdminUser,
} from './admin-data';
const useTeachers = () =>
  useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () =>
      allPages((page) =>
        loadUsers(`role=TEACHER&active=true&limit=100&page=${page}`),
      ),
  });
export function AdminClasses() {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(''),
    [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['admin-classes', search, page],
    queryFn: () =>
      loadClasses(
        new URLSearchParams({ search, page: String(page) }).toString(),
      ),
  });
  const cache = useQueryClient();
  return (
    <>
      <AdminPageHeader
        title="Quản lý lớp học"
        description="Tổ chức lớp, phân công giảng viên và quản lý học viên."
      >
        <a className="admin-primary-link" href="#tao-moi">
          <Plus size={18} /> Tạo lớp học mới
        </a>
      </AdminPageHeader>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <Card className="admin-section" id="tao-moi">
        <div className="admin-section-title">
          <div>
            <h2>Tạo lớp học</h2>
            <p>Chọn giảng viên đang hoạt động để phụ trách lớp.</p>
          </div>
          <StatusBadge tone="primary">Phân công Admin</StatusBadge>
        </div>
        <CreateClass
          onSaved={async () => {
            setNotice('Đã tạo lớp học.');
            await cache.invalidateQueries();
          }}
        />
      </Card>
      <Card className="admin-section">
        <div className="admin-section-title">
          <h2>Danh sách lớp học</h2>
          <span className="muted">Lớp chưa lưu trữ</span>
        </div>
        <SearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        {query.isPending ? (
          <p role="status">Đang tải danh sách lớp học...</p>
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : !query.data.items.length ? (
          <EmptyState title="Chưa có lớp học.">
            Thử tìm theo tên hoặc mã lớp khác.
          </EmptyState>
        ) : (
          <DataTable label="Danh sách lớp học">
            <thead>
              <tr>
                <th scope="col">Lớp học</th>
                <th scope="col">Giảng viên phụ trách</th>
                <th scope="col">Học viên</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <strong>{item.name}</strong>
                    <span className="admin-cell-subtitle">{item.code}</span>
                  </th>
                  <td>
                    {item.teacher.fullName}
                    <span className="admin-cell-subtitle">
                      {item.teacher.email}
                    </span>
                  </td>
                  <td>{item._count?.members ?? 0}</td>
                  <td>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setSelected(item.id)}
                    >
                      Quản lý {item.name}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        {query.data && !query.isError && (
          <Pagination
            page={page}
            total={query.data.total}
            pageCount={query.data.pageCount}
            busy={query.isFetching}
            onPage={setPage}
          />
        )}
      </Card>
      {selected && (
        <ClassDetails id={selected} onClose={() => setSelected('')} />
      )}
    </>
  );
}
function TeacherSelect({
  value,
  onChange,
  teachers,
  current,
}: {
  value: string;
  onChange: (value: string) => void;
  teachers: AdminUser[];
  current?: AdminClass['teacher'];
}) {
  return (
    <label>
      Giảng viên phụ trách
      <select
        aria-label="Giảng viên phụ trách"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Chọn giảng viên</option>
        {current && !teachers.some((teacher) => teacher.id === current.id) && (
          <option value={current.id}>
            {current.fullName} (đang phụ trách)
          </option>
        )}
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.fullName} ({teacher.email})
          </option>
        ))}
      </select>
    </label>
  );
}
function CreateClass({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [description, setDescription] = useState(''),
    [teacher, setTeacher] = useState('');
  const teachers = useTeachers(),
    action = useAdminAction();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      await api.createClass({ name, code, description, teacherId: teacher });
      setName('');
      setCode('');
      setDescription('');
      await onSaved();
    });
  }
  return (
    <form onSubmit={(event) => void submit(event)} aria-label="Tạo lớp học">
      <fieldset className="admin-form-grid" disabled={action.pending}>
        <label>
          Tên lớp
          <Input
            required
            placeholder="Tên lớp"
            minLength={2}
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Mã lớp
          <Input
            required
            placeholder="Mã lớp"
            minLength={2}
            maxLength={40}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <TeacherSelect
          value={teacher}
          onChange={setTeacher}
          teachers={teachers.data || []}
        />
        <label>
          Mô tả lớp
          <Input
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="admin-form-footer">
          <p className="muted">Học viên được thêm sau khi tạo lớp.</p>
          <Button
            type="submit"
            disabled={action.pending || teachers.isPending || teachers.isError}
          >
            {action.pending ? 'Đang tạo...' : 'Tạo lớp'}
          </Button>
        </div>
      </fieldset>
      {teachers.isPending && <p role="status">Đang tải giảng viên...</p>}
      {teachers.isError && (
        <ErrorState
          error={teachers.error}
          retry={() => void teachers.refetch()}
        />
      )}
      {action.error && <ErrorState error={action.error} />}
    </form>
  );
}
function ClassDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['admin-class', id],
    queryFn: () => loadClass(id),
  });
  return (
    <Card className="admin-section" aria-label="Chi tiết quản lý">
      <div className="admin-section-title">
        <h2>Chi tiết lớp học</h2>
      </div>
      {query.isPending ? (
        <p role="status">Đang tải chi tiết...</p>
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ClassEditor key={id} item={query.data} />
      )}
      <div className="contextual-back">
        <BackButton onClick={onClose} label="Quay lại danh sách lớp học" />
      </div>
    </Card>
  );
}
function ClassEditor({ item }: { item: AdminClass }) {
  const cache = useQueryClient(),
    teachers = useTeachers(),
    action = useAdminAction();
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(item.name),
    [description, setDescription] = useState(item.description || ''),
    [teacher, setTeacher] = useState(item.teacherId),
    [notice, setNotice] = useState(''),
    [confirm, setConfirm] = useState<
      'reassign' | { id: string; name: string } | null
    >(null);
  async function save() {
    await api.updateClass(item.id, { name, description, teacherId: teacher });
    setEditing(false);
    setNotice('Đã lưu thay đổi.');
    await cache.invalidateQueries();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (teacher !== item.teacherId) setConfirm('reassign');
    else await action.run(save);
  }
  return (
    <>
      <dl className="admin-detail-grid">
        <div>
          <dt>Lớp học</dt>
          <dd>
            {item.name} · {item.code}
          </dd>
        </div>
        <div>
          <dt>Giảng viên phụ trách</dt>
          <dd>{item.teacher.fullName}</dd>
        </div>
        <div>
          <dt>Mô tả lớp</dt>
          <dd>{item.description || 'Chưa có mô tả.'}</dd>
        </div>
      </dl>
      <Button
        variant="outline"
        type="button"
        onClick={() => {
          setEditing(!editing);
          setName(item.name);
          setDescription(item.description || '');
          setTeacher(item.teacherId);
        }}
      >
        {editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
      </Button>
      {editing && (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset className="admin-form-grid" disabled={action.pending}>
            <label>
              Tên lớp
              <Input
                required
                minLength={2}
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Mô tả lớp
              <Input
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <TeacherSelect
              value={teacher}
              onChange={setTeacher}
              teachers={teachers.data || []}
              current={item.teacher}
            />
            <Button
              type="submit"
              disabled={
                action.pending || teachers.isPending || teachers.isError
              }
            >
              Lưu thay đổi
            </Button>
          </fieldset>
          {teachers.isError && (
            <ErrorState
              error={teachers.error}
              retry={() => void teachers.refetch()}
            />
          )}
        </form>
      )}
      {action.error && <ErrorState error={action.error} />}
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      <section className="admin-roster" aria-label="Danh sách học viên">
        <h3>Thành viên {item.name}</h3>
        <StudentPicker
          classId={item.id}
          onSaved={async () => {
            setNotice('Đã thêm học viên.');
            await cache.invalidateQueries();
          }}
        />
        {!item.members?.length ? (
          <EmptyState title="Lớp chưa có học viên.">
            Tìm và chọn học viên để thêm vào lớp.
          </EmptyState>
        ) : (
          <DataTable label="Thành viên lớp">
            <thead>
              <tr>
                <th scope="col">Học viên</th>
                <th scope="col">Email</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {item.members.map((member) => (
                <tr key={member.id}>
                  <th scope="row">{member.student.fullName}</th>
                  <td>{member.student.email}</td>
                  <td>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setConfirm({
                          id: member.studentId,
                          name: member.student.fullName,
                        })
                      }
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
      {confirm && (
        <ConfirmationDialog
          title={
            confirm === 'reassign'
              ? 'Đổi giảng viên phụ trách?'
              : 'Xóa học viên khỏi lớp?'
          }
          description={
            confirm === 'reassign'
              ? 'Quyền quản lý lớp và xem báo cáo lớp sẽ chuyển sang giảng viên mới. Các bài làm đã lưu được giữ nguyên.'
              : `${confirm.name} sẽ rời lớp. Tài khoản và bài làm được giữ nguyên; phạm vi truy cập sẽ thay đổi theo lớp đang tham gia.`
          }
          actionLabel="Xác nhận"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (confirm === 'reassign') await save();
            else {
              await api.removeStudent(item.id, confirm.id);
              setNotice('Đã xóa học viên khỏi lớp.');
              await cache.invalidateQueries();
            }
          }}
        />
      )}
    </>
  );
}
function StudentPicker({
  classId,
  onSaved,
}: {
  classId: string;
  onSaved: () => Promise<void>;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [student, setStudent] = useState('');
  const query = useQuery({
    queryKey: ['admin-student-picker', search, page],
    queryFn: () =>
      loadUsers(
        new URLSearchParams({
          role: 'STUDENT',
          active: 'true',
          search,
          page: String(page),
          limit: '20',
        }).toString(),
      ),
  });
  const action = useAdminAction();
  return (
    <div className="admin-student-picker">
      <div className="admin-picker-fields">
        <label>
          Tìm học viên
          <Input
            aria-label="Tìm học viên"
            maxLength={150}
            placeholder="Tên hoặc email học viên"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setStudent('');
            }}
          />
        </label>
        <label>
          Học viên cần thêm
          <select
            aria-label="Học viên cần thêm"
            value={student}
            disabled={query.isPending || query.isError}
            onChange={(event) => setStudent(event.target.value)}
          >
            <option value="">Chọn học viên</option>
            {query.data?.items.map((user) => (
              <option value={user.id} key={user.id}>
                {user.fullName} ({user.email})
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          disabled={!student || action.pending}
          onClick={() =>
            void action.run(async () => {
              await api.addStudent(classId, student);
              setStudent('');
              await onSaved();
            })
          }
        >
          {action.pending ? 'Đang thêm...' : 'Thêm'}
        </Button>
      </div>
      {query.isPending && <p role="status">Đang tải học viên...</p>}
      {query.isError && (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      )}
      {query.data && !query.isError && (
        <div className="admin-picker-pagination">
          <span>
            {query.data.total} học viên · Trang {page} /{' '}
            {Math.max(1, query.data.pageCount)}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1 || query.isFetching}
            onClick={() => {
              setPage(page - 1);
              setStudent('');
            }}
          >
            Học viên trước
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= query.data.pageCount || query.isFetching}
            onClick={() => {
              setPage(page + 1);
              setStudent('');
            }}
          >
            Học viên sau
          </Button>
        </div>
      )}
      {action.error && <ErrorState error={action.error} />}
    </div>
  );
}
