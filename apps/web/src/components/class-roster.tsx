'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { managementHref } from '@/lib/management-links';
import {
  readMemberFilters,
  memberHref,
  type MemberFilters,
} from '@/lib/management-page-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { ManagementDetail } from '@/components/management-detail';
export function ClassRoster({
  classId,
  role,
  initialFilters = readMemberFilters({}),
  onRemove,
}: {
  classId: string;
  role: 'admin' | 'teacher';
  initialFilters?: MemberFilters;
  onRemove: (id: string, name: string) => void;
}) {
  const [filters, setFilters] = useState(initialFilters),
    [selected, setSelected] = useState('');
  function update(patch: Partial<MemberFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    window.history.replaceState(null, '', memberHref(role, classId, next));
  }
  const q = useQuery({
    queryKey: ['class-roster', classId, filters],
    queryFn: () =>
      api.classMembersPage(
        classId,
        new URLSearchParams({
          paged: 'true',
          search: filters.search,
          active: filters.active,
          page: String(filters.page),
          limit: String(filters.limit),
        }).toString(),
      ),
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <div>
      <div className="admin-toolbar">
        <label>
          Tìm thành viên
          <Input
            aria-label="Tìm thành viên lớp"
            maxLength={150}
            value={filters.search}
            onChange={(e) => update({ search: e.target.value, page: 1 })}
          />
        </label>
        <label>
          Trạng thái tài khoản
          <select
            aria-label="Trạng thái thành viên"
            value={filters.active}
            onChange={(e) => update({ active: e.target.value, page: 1 })}
          >
            <option value="all">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        </label>
        <label>
          Số thành viên / trang
          <select
            aria-label="Số thành viên mỗi trang"
            value={filters.limit}
            onChange={(e) => update({ limit: Number(e.target.value), page: 1 })}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      {q.isPending ? (
        <p role="status">Đang tải thành viên...</p>
      ) : q.isError ? (
        <div role="alert">
          <p>{q.error.message}</p>
          <Button type="button" onClick={() => void q.refetch()}>
            Thử lại danh sách thành viên
          </Button>
        </div>
      ) : (
        <>
          <p className="muted">
            {q.data.total} thành viên phù hợp · Trang {q.data.page}/
            {Math.max(1, q.data.pageCount)}
          </p>
          {!q.data.items.length ? (
            <p>Không có thành viên phù hợp.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" aria-label="Thành viên lớp">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((m) => (
                    <tr key={m.id}>
                      <th scope="row">
                        {role === 'admin' ? (
                          <Link
                            className="admin-secondary-link"
                            href={managementHref('users', m.studentId)}
                          >
                            {m.student.fullName}
                          </Link>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setSelected(m.studentId)}
                          >
                            {m.student.fullName}
                          </Button>
                        )}
                      </th>
                      <td>{m.student.email}</td>
                      <td>{m.student.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            onRemove(m.studentId, m.student.fullName)
                          }
                        >
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={q.data.page}
            total={q.data.total}
            pageCount={q.data.pageCount}
            busy={q.isFetching}
            onPage={(page) => update({ page })}
          />
        </>
      )}
      {selected && role === 'teacher' && (
        <section aria-label="Hồ sơ thành viên">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelected('')}
          >
            Đóng hồ sơ
          </Button>
          <ManagementDetail kind="users" id={selected} />
        </section>
      )}
    </div>
  );
}
