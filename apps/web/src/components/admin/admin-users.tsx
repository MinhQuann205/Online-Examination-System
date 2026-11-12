'use client';
import { BackButton } from '@/components/back-navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import {
  AdminPageHeader,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  ErrorState,
  SearchToolbar,
  SecretDialog,
  StatusBadge,
  useAdminAction,
} from './admin-ui';
import { loadUser, loadUsers, roleLabel, type AdminUser } from './admin-data';

export function AdminUsers() {
  const cache = useQueryClient();
  const [search, setSearch] = useState(''),
    [role, setRole] = useState(''),
    [active, setActive] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(''),
    [notice, setNotice] = useState(''),
    [secret, setSecret] = useState('');
  const [confirmation, setConfirmation] = useState<{
    user: AdminUser;
    kind: 'status' | 'reset';
  } | null>(null);
  const closeSecret = useCallback(() => setSecret(''), []);
  const query = useQuery({
    queryKey: ['admin-users', search, role, active, page],
    queryFn: () =>
      loadUsers(
        new URLSearchParams({
          search,
          page: String(page),
          ...(role ? { role } : {}),
          ...(active ? { active } : {}),
        }).toString(),
      ),
  });
  const reload = async () => {
    await cache.invalidateQueries();
  };
  async function confirm() {
    if (!confirmation) return;
    if (confirmation.kind === 'reset') {
      // This secret stays in component memory; never put reset responses in Query/MutationCache.
      const result = await api.resetUserPassword(confirmation.user.id);
      setSecret(result.temporaryPassword);
    } else {
      await api.setUserStatus(
        confirmation.user.id,
        !confirmation.user.isActive,
      );
      setNotice('Đã cập nhật trạng thái tài khoản.');
    }
    await reload();
  }
  return (
    <>
      <AdminPageHeader
        title="Quản lý người dùng"
        description="Tài khoản, vai trò và quyền truy cập trong hệ thống."
      >
        <a href="#tao-moi" className="admin-primary-link">
          <UserPlus size={18} /> Tạo tài khoản mới
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
            <h2>Tạo tài khoản</h2>
            <p>Cấp tài khoản học viên hoặc giảng viên.</p>
          </div>
          <StatusBadge tone="primary">Quyền Admin</StatusBadge>
        </div>
        <CreateUser
          onSaved={async () => {
            setNotice('Đã tạo tài khoản.');
            await reload();
          }}
        />
      </Card>
      <Card className="admin-section">
        <div className="admin-section-title">
          <h2>Danh sách người dùng</h2>
          <span className="muted">
            {query.data && !query.isError
              ? `${query.data.total} tài khoản`
              : 'Tra cứu tài khoản'}
          </span>
        </div>
        <SearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        >
          <label>
            Vai trò
            <select
              aria-label="Vai trò"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="TEACHER">Giảng viên</option>
              <option value="STUDENT">Học viên</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select
              aria-label="Trạng thái"
              value={active}
              onChange={(event) => {
                setActive(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </label>
        </SearchToolbar>
        {query.isPending ? (
          <p role="status">Đang tải danh sách người dùng...</p>
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : !query.data.items.length ? (
          <EmptyState title="Chưa có người dùng.">
            Thử đổi từ khóa hoặc bộ lọc, hoặc tạo tài khoản mới.
          </EmptyState>
        ) : (
          <DataTable label="Danh sách người dùng">
            <thead>
              <tr>
                <th scope="col">Tên</th>
                <th scope="col">Email</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((user) => (
                <tr key={user.id}>
                  <th scope="row">
                    <span className="admin-person">
                      <span className="admin-avatar" aria-hidden="true">
                        {user.fullName.slice(0, 1)}
                      </span>
                      {user.fullName}
                    </span>
                  </th>
                  <td>{user.email}</td>
                  <td>{roleLabel[user.role]}</td>
                  <td>
                    <StatusBadge tone={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelected(user.id)}
                      >
                        Xem chi tiết
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setConfirmation({ user, kind: 'status' })
                        }
                      >
                        {user.isActive ? 'Khóa' : 'Mở khóa'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirmation({ user, kind: 'reset' })}
                      >
                        Đặt lại mật khẩu
                      </Button>
                    </div>
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
            onPage={setPage}
            busy={query.isFetching}
          />
        )}
      </Card>
      {selected && (
        <UserDetails id={selected} onClose={() => setSelected('')} />
      )}
      {confirmation && (
        <ConfirmationDialog
          title={
            confirmation.kind === 'reset'
              ? 'Đặt lại mật khẩu?'
              : confirmation.user.isActive
                ? 'Khóa tài khoản?'
                : 'Mở khóa tài khoản?'
          }
          description={`${confirmation.user.fullName} (${confirmation.user.email}). ${confirmation.kind === 'reset' ? 'Mật khẩu hiện tại sẽ được thay thế và các phiên cũ mất hiệu lực. Nếu là tài khoản của bạn, bạn cần đăng nhập lại.' : 'Thay đổi này ảnh hưởng quyền đăng nhập và các phiên của tài khoản.'}`}
          actionLabel={
            confirmation.kind === 'reset'
              ? 'Xác nhận đặt lại mật khẩu'
              : 'Xác nhận'
          }
          onConfirm={confirm}
          onClose={() => setConfirmation(null)}
        />
      )}
      {secret && <SecretDialog password={secret} onClose={closeSecret} />}
    </>
  );
}
function CreateUser({ onSaved }: { onSaved: () => Promise<void> }) {
  const [email, setEmail] = useState(''),
    [fullName, setName] = useState(''),
    [role, setRole] = useState('STUDENT'),
    [password, setPassword] = useState('');
  const action = useAdminAction();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      try {
        await api.createUser({ email, fullName, role, password });
      } finally {
        setPassword('');
      }
      setEmail('');
      setName('');
      await onSaved();
    });
  }
  return (
    <form onSubmit={(event) => void submit(event)} aria-label="Tạo tài khoản">
      <fieldset disabled={action.pending} className="admin-form-grid">
        <label>
          Email
          <Input
            required
            type="email"
            placeholder="Email"
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Họ và tên
          <Input
            required
            minLength={2}
            maxLength={150}
            placeholder="Họ và tên"
            value={fullName}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Vai trò tài khoản
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="STUDENT">Học viên</option>
            <option value="TEACHER">Giảng viên</option>
          </select>
        </label>
        <label>
          Mật khẩu tạm
          <Input
            required
            minLength={12}
            maxLength={128}
            type="password"
            autoComplete="new-password"
            placeholder="Mật khẩu tạm (ít nhất 12 ký tự)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="admin-form-footer">
          <p className="muted">
            Tài khoản quản trị không được cấp qua biểu mẫu này.
          </p>
          <Button type="submit" disabled={action.pending}>
            {action.pending ? 'Đang tạo...' : 'Tạo tài khoản'}
          </Button>
        </div>
      </fieldset>
      {action.error && <ErrorState error={action.error} />}
    </form>
  );
}
function UserDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => loadUser(id),
  });
  return (
    <Card className="admin-section" aria-label="Chi tiết quản lý">
      <div className="admin-section-title">
        <h2>Chi tiết tài khoản</h2>
      </div>
      {detail.isPending ? (
        <p role="status">Đang tải chi tiết...</p>
      ) : detail.isError ? (
        <ErrorState error={detail.error} retry={() => void detail.refetch()} />
      ) : (
        <UserEditor key={id} user={detail.data} />
      )}
      <div className="contextual-back">
        <BackButton onClick={onClose} label="Quay lại danh sách người dùng" />
      </div>
    </Card>
  );
}
function UserEditor({ user }: { user: AdminUser }) {
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(user.fullName),
    [email, setEmail] = useState(user.email),
    [saved, setSaved] = useState(false);
  const cache = useQueryClient(),
    action = useAdminAction();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      await api.updateUser(user.id, { fullName: name, email });
      setSaved(true);
      setEditing(false);
      await cache.invalidateQueries();
    });
  }
  return (
    <>
      <dl className="admin-detail-grid">
        <div>
          <dt>Họ và tên</dt>
          <dd>{user.fullName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Vai trò</dt>
          <dd>{roleLabel[user.role]}</dd>
        </div>
        <div>
          <dt>Trạng thái</dt>
          <dd>{user.isActive ? 'Hoạt động' : 'Đã khóa'}</dd>
        </div>
      </dl>
      <Button
        variant="outline"
        type="button"
        onClick={() => {
          setEditing(!editing);
          setName(user.fullName);
          setEmail(user.email);
        }}
      >
        {editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
      </Button>
      {editing && (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset className="admin-form-grid" disabled={action.pending}>
            <label>
              Họ và tên
              <Input
                required
                minLength={2}
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Email
              <Input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={action.pending}>
              Lưu thay đổi
            </Button>
          </fieldset>
        </form>
      )}
      {action.error && <ErrorState error={action.error} />}
      {saved && <p role="status">Đã lưu thay đổi.</p>}
      {!!user.memberships?.length && (
        <div>
          <h3>Lớp đang tham gia</h3>
          <ul>
            {user.memberships.map((member) => (
              <li key={member.classId}>
                {member.class.name} · {member.class.code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
