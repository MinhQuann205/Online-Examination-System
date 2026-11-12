'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import {
  StudentHeading,
  SearchToolbar,
  EmptyState,
  ErrorState,
  useStudentSessionError,
} from './student-ui';
function ClassDetail({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ['student-class', id],
    queryFn: () => api.classDetail(id),
    staleTime: 0,
    gcTime: 0,
  });
  useStudentSessionError(q.error);
  return (
    <section className="student-class-detail" aria-label="Chi tiết lớp học">
      <Button variant="outline" onClick={() => void q.refetch()}>
        Làm mới chi tiết
      </Button>
      {q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : q.isPending ? (
        <p role="status">Đang tải chi tiết...</p>
      ) : (
        <>
          <h3>{q.data.name}</h3>
          <p>{q.data.description || 'Chưa có mô tả lớp học.'}</p>
          <dl className="student-meta">
            <div>
              <dt>Mã lớp</dt>
              <dd>{q.data.code}</dd>
            </div>
            <div>
              <dt>Giảng viên</dt>
              <dd>{q.data.teacher.fullName}</dd>
            </div>
            <div>
              <dt>Email giảng viên</dt>
              <dd>{q.data.teacher.email}</dd>
            </div>
          </dl>
          <p className="muted">
            Thông tin lớp dành cho thành viên. Liên hệ giảng viên nếu cần hỗ
            trợ.
          </p>
        </>
      )}
    </section>
  );
}
export function StudentClasses() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['student-classes', page, search],
    queryFn: () =>
      api.classes(
        new URLSearchParams({ page: String(page), search }).toString(),
      ),
    staleTime: 0,
    gcTime: 0,
  });
  useStudentSessionError(q.error);
  return (
    <div className="student-page">
      <StudentHeading
        title="Lớp học của tôi"
        description="Những lớp học bạn đang tham gia và thông tin giảng viên phụ trách."
      />
      <Card className="student-panel">
        <SearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
            setSelected(null);
          }}
        >
          <Button
            variant="outline"
            onClick={() => {
              setSelected(null);
              void q.refetch();
            }}
          >
            Làm mới
          </Button>
        </SearchToolbar>
        {q.isError ? (
          <ErrorState error={q.error} retry={() => void q.refetch()} />
        ) : q.isPending ? (
          <p role="status">Đang tải lớp học...</p>
        ) : (
          <>
            <p className="muted">{q.data.total} lớp học</p>
            <div className="student-collection">
              {q.data.items.map((item) => (
                <article
                  className="student-class-card"
                  key={item.id}
                  data-class-id={item.id}
                >
                  <div className="student-section-heading">
                    <div>
                      <BookOpen size={24} aria-hidden="true" />
                      <h2>{item.name}</h2>
                      <p className="muted">{item.code}</p>
                    </div>
                    <Button
                      variant="outline"
                      aria-expanded={selected === item.id}
                      aria-controls={'class-' + item.id}
                      onClick={() =>
                        setSelected(selected === item.id ? null : item.id)
                      }
                    >
                      {selected === item.id ? 'Đóng chi tiết' : 'Xem chi tiết'}
                    </Button>
                  </div>
                  <p>Giảng viên: {item.teacher.fullName}</p>
                  <div id={'class-' + item.id}>
                    {selected === item.id && <ClassDetail id={item.id} />}
                  </div>
                </article>
              ))}
            </div>
            {!q.data.items.length && (
              <EmptyState title="Chưa có lớp học phù hợp." />
            )}
            <Pagination
              page={page}
              total={q.data.total}
              pageCount={q.data.pageCount}
              busy={q.isFetching}
              onPage={(value) => {
                setPage(value);
                setSelected(null);
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
