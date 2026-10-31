'use client';

import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  total,
  pageCount,
  onPage,
  busy = false,
}: {
  page: number;
  total: number;
  pageCount: number;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-end gap-3 py-3 text-sm"
    >
      <span>
        {total} bản ghi · Trang {page} / {Math.max(1, pageCount)}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={busy || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Trang trước
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy || page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        Trang sau
      </Button>
      {busy && <span role="status">Đang tải...</span>}
    </nav>
  );
}
