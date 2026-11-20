'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import type { RemoteChoice } from '@/lib/examination-operations';
type Kind = 'students' | 'classes' | 'exams';
const labels = { students: 'Học viên', classes: 'Lớp học', exams: 'Đề thi' };
export function RemoteAssignmentSelect({
  kind,
  value,
  onChange,
  enabled = true,
}: {
  kind: Kind;
  value: RemoteChoice | null;
  onChange: (value: RemoteChoice | null) => void;
  enabled?: boolean;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['assignment-options', kind, search.trim(), page],
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        search: search.trim(),
        page: String(page),
        limit: '20',
      });
      if (kind === 'students') {
        params.set('role', 'STUDENT');
        params.set('active', 'true');
        const r = await api.users(params.toString());
        return {
          ...r,
          items: r.items.map((x) => ({
            id: x.id,
            label: x.fullName,
            detail: x.email,
          })),
        };
      }
      if (kind === 'classes') {
        params.set('archived', 'false');
        const r = await api.classes(params.toString());
        return {
          ...r,
          items: r.items.map((x) => ({
            id: x.id,
            label: x.name,
            detail: x.code,
          })),
        };
      }
      params.delete('limit');
      params.set('assignable', 'true');
      const r = await api.exams(params.toString());
      return {
        ...r,
        items: r.items.map((x) => ({
          id: x.id as string,
          label: x.title as string,
          detail: 'Có phiên bản đã xuất bản',
        })),
      };
    },
  });
  return (
    <fieldset
      disabled={!enabled}
      className="space-y-3 min-w-0 rounded-lg border p-3"
    >
      <legend className="font-semibold">{labels[kind]}</legend>
      <label className="block">
        Tìm {labels[kind].toLowerCase()}
        <Input
          value={search}
          maxLength={kind === 'exams' ? 200 : 150}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <div
        className="rounded bg-slate-100 p-3 dark:bg-slate-800"
        aria-live="polite"
        data-selected-id={value?.id ?? ''}
      >
        {value ? (
          <>
            <p>Đã chọn: {value.label}</p>
            {value.detail && (
              <p className="break-words text-sm">{value.detail}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(null)}
            >
              Bỏ chọn {labels[kind].toLowerCase()}
            </Button>
          </>
        ) : (
          <p>Chưa chọn {labels[kind].toLowerCase()}.</p>
        )}
      </div>
      {q.isPending ? (
        <p role="status">Đang tìm...</p>
      ) : q.isError ? (
        <div role="alert">
          <p>Không thể tải lựa chọn. Lựa chọn đã giữ lại; hãy thử tải lại.</p>
          <Button type="button" onClick={() => void q.refetch()}>
            Thử lại {labels[kind].toLowerCase()}
          </Button>
        </div>
      ) : (
        <>
          {!q.data.items.length && (
            <p>Không có lựa chọn phù hợp. Thử đổi từ khóa.</p>
          )}
          <ul className="max-h-64 overflow-y-auto space-y-2">
            {q.data.items.map((option) => (
              <li
                key={option.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
              >
                <div className="min-w-0">
                  <p>{option.label}</p>
                  <p className="break-words text-sm muted">{option.detail}</p>
                </div>
                <Button
                  type="button"
                  variant={value?.id === option.id ? 'default' : 'outline'}
                  data-option-id={option.id}
                  aria-pressed={value?.id === option.id}
                  onClick={() => onChange(option)}
                >
                  {value?.id === option.id ? 'Đã chọn' : 'Chọn'} {option.label}
                </Button>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            total={q.data.total}
            pageCount={q.data.pageCount}
            busy={q.isFetching}
            onPage={setPage}
          />
        </>
      )}
      <p className="muted text-sm">
        Tối đa20 dòng mỗi trang. Đổi từ khóa/trang không đổi lựa chọn; máy chủ
        kiểm tra lại quyền khi review và tạo bài giao.
      </p>
    </fieldset>
  );
}
