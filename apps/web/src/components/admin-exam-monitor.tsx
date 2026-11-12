'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import {
  AdminPageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  SearchToolbar,
  StatusBadge,
} from './admin/admin-ui';
import { loadExams } from './admin/admin-data';
const labels = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã phát hành',
  ARCHIVED: 'Đã lưu trữ',
};
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : 'Không giới hạn';
export function AdminExamMonitor() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [selected, setSelected] = useState<{ id: string; title: string } | null>(
      null,
    );
  const exams = useQuery({
    queryKey: ['admin-exams', page, search, status],
    queryFn: () =>
      loadExams(
        new URLSearchParams({
          page: String(page),
          search,
          ...(status ? { status } : {}),
        }).toString(),
      ),
  });
  return (
    <>
      <AdminPageHeader
        title="Theo dõi bài thi"
        description="Theo dõi phát hành, phiên bản, bài giao và lượt làm."
      >
        <Button
          type="button"
          variant="outline"
          disabled={exams.isFetching}
          onClick={() => void exams.refetch()}
        >
          Tải lại dữ liệu
        </Button>
      </AdminPageHeader>
      <Card className="admin-section">
        <div className="admin-section-title">
          <div>
            <h2>Đề thi trong hệ thống</h2>
            <p>Tìm đề và mở báo cáo kết quả theo quyền quản trị.</p>
          </div>
          <StatusBadge tone="primary">
            {exams.data && !exams.isError
              ? `${exams.data.total} đề phù hợp`
              : 'Tra cứu đề thi'}
          </StatusBadge>
        </div>
        <SearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        >
          <label>
            Trạng thái đề
            <select
              aria-label="Trạng thái đề"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </SearchToolbar>
        {exams.isPending ? (
          <p role="status">Đang tải danh sách bài thi...</p>
        ) : exams.isError ? (
          <ErrorState error={exams.error} retry={() => void exams.refetch()} />
        ) : !exams.data.items.length ? (
          <EmptyState title="Chưa có đề thi.">
            Thử đổi từ khóa hoặc bộ lọc trạng thái.
          </EmptyState>
        ) : (
          <DataTable label="Danh sách đề thi">
            <thead>
              <tr>
                <th scope="col">Đề thi</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Phiên bản</th>
                <th scope="col">Hoạt động</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {exams.data.items.map((exam) => (
                <tr key={exam.id}>
                  <th scope="row">
                    <h2 className="admin-table-title">{exam.title}</h2>
                  </th>
                  <td>
                    <StatusBadge
                      tone={
                        exam.status === 'PUBLISHED'
                          ? 'success'
                          : exam.status === 'DRAFT'
                            ? 'primary'
                            : 'neutral'
                      }
                    >
                      {labels[exam.status]}
                    </StatusBadge>
                  </td>
                  <td>
                    <strong>Bản hiện tại v{exam.version}</strong>
                    <span className="admin-cell-subtitle">
                      {exam.versions.length
                        ? exam.versions
                            .map((version) => `v${version.number}`)
                            .join(' · ')
                        : 'Chưa có bản phát hành'}
                    </span>
                  </td>
                  <td>
                    <strong>{exam._count.assignments} bài giao</strong>
                    <span className="admin-cell-subtitle">
                      {exam._count.attempts} lượt làm
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setSelected({ id: exam.id, title: exam.title })
                        }
                      >
                        Xem bài giao
                      </Button>
                      <Link
                        className="admin-table-link"
                        href={`/admin/exams/${exam.id}/results`}
                      >
                        Theo dõi kết quả
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        {exams.data && !exams.isError && (
          <Pagination
            page={page}
            total={exams.data.total}
            pageCount={exams.data.pageCount}
            onPage={setPage}
            busy={exams.isFetching}
          />
        )}
      </Card>
      {selected && (
        <AssignmentPanel
          key={selected.id}
          exam={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function AssignmentPanel({
  exam,
  onClose,
}: {
  exam: { id: string; title: string };
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin-exam-assignments', exam.id, page],
    queryFn: () => api.examAssignments(`examId=${exam.id}&page=${page}`),
  });
  return (
    <Card className="admin-section" aria-label="Bài giao và phiên bản">
      <div className="admin-section-title">
        <div>
          <h2>Bài giao của {exam.title}</h2>
          <p>Tên đề và phiên bản bên dưới thuộc từng bài đã giao.</p>
        </div>
        <Button variant="ghost" type="button" onClick={onClose}>
          Đóng bài giao
        </Button>
      </div>
      {query.isPending ? (
        <p role="status">Đang tải bài giao...</p>
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.items.length ? (
        <EmptyState title="Chưa có bài giao.">
          Đề thi này chưa được giao cho lớp hoặc học viên.
        </EmptyState>
      ) : (
        <DataTable label="Bài giao theo phiên bản">
          <thead>
            <tr>
              <th scope="col">Đề được giao</th>
              <th scope="col">Người nhận</th>
              <th scope="col">Lịch làm bài</th>
              <th scope="col">Lượt làm</th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  {item.exam.title}
                  <span className="admin-cell-subtitle">
                    {item.examVersion
                      ? `Phiên bản ${item.examVersion.number}`
                      : 'Chưa gắn phiên bản'}
                  </span>
                </th>
                <td>
                  {item.class
                    ? `${item.class.name} · ${item.class.code}`
                    : item.student?.fullName || 'Không có người nhận'}
                </td>
                <td>
                  <span>Mở: {date(item.opensAt)}</span>
                  <span className="admin-cell-subtitle">
                    Đóng: {date(item.closesAt)}
                  </span>
                </td>
                <td>
                  {item._count.attempts} lượt làm
                  <span className="admin-cell-subtitle">
                    Tối đa {item.maxAttempts} lượt / học viên
                  </span>
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
  );
}
