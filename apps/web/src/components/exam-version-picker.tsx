'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Pagination } from './pagination';
import { ErrorState } from './teacher/teacher-ui';

export function ExamVersionPicker({
  examId,
  value,
  onChange,
  disabled = false,
  enabled = true,
  history = false,
}: {
  examId: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  enabled?: boolean;
  history?: boolean;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const valid =
    !search.trim() ||
    (/^v?[1-9]\d*$/i.test(search.trim()) &&
      Number(search.trim().replace(/^v/i, '')) <= 2147483647);
  const query = new URLSearchParams({
    page: String(page),
    search: search.trim(),
  }).toString();
  const list = useQuery({
    queryKey: ['published-versions-page', examId, query],
    queryFn: () => api.examVersionsPage(examId, query),
    enabled: Boolean(examId) && enabled && valid,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const exact = useQuery({
    queryKey: ['published-version', examId, value],
    queryFn: () =>
      api.examVersionsPage(
        examId,
        new URLSearchParams({ id: value }).toString(),
      ),
    enabled: Boolean(examId && value) && enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const selected = exact.data?.items.find((x) => x.id === value);
  const items = list.data?.items ?? [];
  return (
    <fieldset
      disabled={disabled || !enabled || !examId}
      className="space-y-3 min-w-0 rounded-lg border p-3"
    >
      <legend className="font-semibold">Phiên bản đã xuất bản</legend>
      <label className="block">
        Tìm số phiên bản
        <Input
          aria-label="Tìm số phiên bản"
          maxLength={12}
          placeholder="Ví dụ v2"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {!valid && <p role="alert">Nhập số phiên bản dương, ví dụ v2.</p>}
      {list.isError && (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      )}
      {exact.isError && (
        <ErrorState error={exact.error} retry={() => void exact.refetch()} />
      )}
      {history ? (
        <ul>
          {items.map((x) => (
            <li key={x.id} className="flex flex-wrap gap-2 py-2">
              Phiên bản {x.number} ·{' '}
              {new Date(x.publishedAt).toLocaleString('vi-VN')}
              <Button
                type="button"
                variant="outline"
                aria-pressed={value === x.id}
                onClick={() => onChange(x.id)}
              >
                Xem phiên bản {x.number}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <label className="block">
          Phiên bản đề thi
          <select
            aria-label="Phiên bản đề thi"
            value={value}
            required
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Chọn đúng phiên bản đã xuất bản</option>
            {value && !items.some((x) => x.id === value) && (
              <option value={value}>
                {selected
                  ? `v${selected.number} · đã chọn`
                  : 'Phiên bản đang được kiểm tra'}
              </option>
            )}
            {items.map((x) => (
              <option key={x.id} value={x.id}>
                v{x.number} · {new Date(x.publishedAt).toLocaleString('vi-VN')}
              </option>
            ))}
          </select>
        </label>
      )}
      {list.isFetching && <p role="status">Đang tải phiên bản...</p>}
      {valid && list.isSuccess && !items.length && (
        <p>Không có phiên bản phù hợp.</p>
      )}
      {value && selected && (
        <p role="status">
          Đã chọn chính xác phiên bản {selected.number}; đổi trang không thay
          đổi lựa chọn.
        </p>
      )}
      {value && exact.isSuccess && !selected && (
        <p role="alert">
          Phiên bản không còn khả dụng. Hãy chọn lại; không tự chuyển phiên bản.
        </p>
      )}
      {list.isSuccess && (
        <Pagination
          page={list.data.page}
          total={list.data.total}
          pageCount={list.data.pageCount}
          busy={list.isFetching}
          onPage={setPage}
        />
      )}
    </fieldset>
  );
}
