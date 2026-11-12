'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import { EmptyState, StatusBadge } from '@/components/admin/admin-ui';
import {
  ResultError,
  ResultsHeading,
  ResultStatus,
  resultDate,
  stateLabel,
  useResultActor,
  type ResultRole,
} from './results/results-ui';
type ExamOption = {
  id: string;
  title: string;
  status: string;
  _count: { assignments: number; attempts: number };
};
type AttemptSummary = {
  id: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: string | null;
  maxScore: string | null;
  exam: { title: string; durationMin: number | null };
};
type Recipient = {
  id: string;
  fullName: string;
  email: string;
  attempts: AttemptSummary[];
  isCurrentRecipient: boolean;
  isActive: boolean;
};
type ExamReport = {
  exam: { id: string; title: string };
  assignments: Array<{
    id: string;
    class: { id: string; name: string } | null;
    student: Recipient | null;
    opensAt: string | null;
    closesAt: string | null;
    maxAttempts: number;
    examVersion: {
      id: string | null;
      title: string;
      number: number | null;
      durationMin: number | null;
    };
    students: Recipient[];
  }>;
};
export function TeacherResultsIndex() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('');
  const { session, allowed, user } = useResultActor('TEACHER');
  const q = useQuery({
    queryKey: ['exams', 'results', user?.id, page, search, status],
    queryFn: async () =>
      (await api.exams(
        new URLSearchParams({
          results: 'true',
          page: String(page),
          search,
          ...(status ? { status } : {}),
        }).toString(),
      )) as unknown as {
        items: ExamOption[];
        total: number;
        pageCount: number;
      },
    enabled: allowed,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  if (session.isError)
    return (
      <ResultError error={session.error} retry={() => void session.refetch()} />
    );
  if (!allowed) return <p role="status">Đang xác thực phiên...</p>;
  return (
    <div className="results-page">
      <ResultsHeading
        title="Kết quả thi"
        description="Tra cứu đề thi và mở báo cáo trong phạm vi bạn được quản lý."
      >
        <Button
          type="button"
          variant="outline"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          Làm mới danh sách
        </Button>
      </ResultsHeading>
      <Card className="results-report-card">
        <div className="admin-toolbar">
          <label>
            Tìm kiếm
            <Input
              aria-label="Tìm kiếm"
              placeholder="Tìm kiếm..."
              maxLength={200}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Trạng thái đề
            <select
              aria-label="Trạng thái đề"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {q.isPending ? (
          <p role="status">Đang tải danh sách kết quả...</p>
        ) : q.isError ? (
          <ResultError error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <p className="muted">
              {q.data.total} đề phù hợp. Số lượt làm được API trả theo đề; nội
              dung báo cáo vẫn tuân theo quyền lớp và bài giao.
            </p>
            <div className="results-exam-list">
              {q.data.items.map((exam) => (
                <Card className="results-exam-row" key={exam.id}>
                  <div>
                    <StatusBadge
                      tone={exam.status === 'PUBLISHED' ? 'success' : 'neutral'}
                    >
                      {stateLabel(exam.status)}
                    </StatusBadge>
                    <h2>{exam.title}</h2>
                    <p>
                      {exam._count.assignments} bài giao ·{' '}
                      {exam._count.attempts} lượt làm của đề
                    </p>
                  </div>
                  <Link
                    className="results-exam-link"
                    href={`/teacher/exams/${exam.id}/results`}
                  >
                    Xem kết quả <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                </Card>
              ))}
            </div>
            {!q.data.items.length && (
              <EmptyState title="Chưa có đề thi.">
                Thử đổi từ khóa hoặc bộ lọc. Không có bài làm giả được tạo cho
                đề nháp.
              </EmptyState>
            )}
            <Pagination
              page={page}
              total={q.data.total}
              pageCount={q.data.pageCount}
              onPage={setPage}
              busy={q.isFetching}
            />
          </>
        )}
      </Card>
    </div>
  );
}
export function TeacherExamResults({
  examId,
  role = 'TEACHER',
}: {
  examId: string;
  role?: Extract<ResultRole, 'TEACHER' | 'ADMIN'>;
}) {
  const { session, allowed, user } = useResultActor(role),
    q = useQuery({
      queryKey: ['exam-results', role, user?.id, examId],
      queryFn: async () =>
        (await api.examResults(examId)) as unknown as ExamReport,
      enabled: allowed,
      retry: false,
      staleTime: 0,
      gcTime: 0,
    });
  if (session.isError)
    return (
      <ResultError error={session.error} retry={() => void session.refetch()} />
    );
  if (!allowed || q.isPending) return <p role="status">Đang tải kết quả...</p>;
  if (q.isError)
    return <ResultError error={q.error} retry={() => void q.refetch()} />;
  const data = q.data;
  return (
    <div className="results-page">
      <ResultsHeading
        title={data.exam.title}
        description="Báo cáo đề thi. Tên đề hiện tại ở tiêu đề; từng bài giao và lượt làm giữ thông tin lịch sử riêng."
      >
        <Button
          type="button"
          variant="outline"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          Làm mới báo cáo
        </Button>
      </ResultsHeading>
      <p className="muted">
        {data.assignments.length} bài giao trong báo cáo được phép xem. Danh
        sách học viên và lượt làm dưới đây là toàn bộ dữ liệu endpoint này trả
        về, không phải thống kê toàn hệ thống.
      </p>
      {data.assignments.map((asg) => (
        <Card
          className="results-report-card"
          key={asg.id}
          data-report-assignment={asg.id}
        >
          <header>
            <div>
              <StatusBadge tone="primary">
                Phiên bản {asg.examVersion.number ?? 'không khả dụng'}
              </StatusBadge>
              <h2>{asg.examVersion.title}</h2>
              <p>{asg.class?.name ?? asg.student?.fullName ?? 'Bài giao'}</p>
            </div>
          </header>
          <dl className="results-meta">
            <div>
              <dt>Mở từ</dt>
              <dd>
                {asg.opensAt ? resultDate(asg.opensAt) : 'Không giới hạn'}
              </dd>
            </div>
            <div>
              <dt>Đóng lúc</dt>
              <dd>
                {asg.closesAt ? resultDate(asg.closesAt) : 'Không giới hạn'}
              </dd>
            </div>
            <div>
              <dt>Giới hạn lượt làm</dt>
              <dd>{asg.maxAttempts} lượt / học viên</dd>
            </div>
          </dl>
          {!asg.students.length ? (
            <EmptyState title="Chưa có học viên trong phạm vi giao bài.">
              Không có kết quả để hiển thị.
            </EmptyState>
          ) : (
            <div
              className="results-table-scroll"
              role="region"
              aria-label={`Lượt làm của ${asg.class?.name ?? asg.student?.fullName ?? asg.examVersion.title}`}
              tabIndex={0}
            >
              <table>
                <caption>Học viên và các lượt làm trong bài giao</caption>
                <thead>
                  <tr>
                    <th scope="col">Học viên</th>
                    <th scope="col">Bài thi của lượt làm</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Điểm</th>
                    <th scope="col">Thời điểm nộp</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {asg.students.flatMap((student) =>
                    (student.attempts.length ? student.attempts : [null]).map(
                      (attempt) => (
                        <tr key={student.id + ':' + (attempt?.id ?? 'empty')}>
                          <td>
                            {student.fullName}
                            <small>{student.email}</small>
                            {!student.isCurrentRecipient && (
                              <small>Học viên từng tham gia</small>
                            )}
                            {!student.isActive && (
                              <small>Tài khoản đã khóa</small>
                            )}
                          </td>
                          <td>{attempt?.exam.title ?? '—'}</td>
                          <td>
                            {attempt ? (
                              <ResultStatus status={attempt.status} />
                            ) : (
                              'Chưa bắt đầu'
                            )}
                          </td>
                          <td>
                            {attempt?.score != null
                              ? `${attempt.score} / ${attempt.maxScore ?? '—'}`
                              : '—'}
                          </td>
                          <td>{resultDate(attempt?.submittedAt)}</td>
                          <td>
                            {attempt && attempt.status !== 'IN_PROGRESS' && (
                              <Link
                                className="results-exam-link"
                                href={`/${role === 'ADMIN' ? 'admin' : 'teacher'}/results/${attempt.id}`}
                              >
                                Chi tiết
                              </Link>
                            )}
                          </td>
                        </tr>
                      ),
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}
      {!data.assignments.length && (
        <Card className="results-report-card">
          <EmptyState title="Đề thi chưa có bài giao trong phạm vi của bạn.">
            Chưa có báo cáo kết quả để hiển thị. Trạng thái nháp không tự tạo
            hoặc xóa lịch sử lượt làm.
          </EmptyState>
        </Card>
      )}
    </div>
  );
}
