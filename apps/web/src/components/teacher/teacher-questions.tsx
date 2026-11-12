'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuestionForm } from '@/components/question-form';
import { ManagementDetail } from '@/components/management-detail';
import { Pagination } from '@/components/pagination';
import {
  TeacherHeading,
  ErrorState,
  EmptyState,
  StatusBadge,
  ConfirmationDialog,
  useTeacherAction,
} from './teacher-ui';
const typeNames: Record<string, string> = {
  SINGLE_CHOICE: 'Một đáp án',
  MULTIPLE_CHOICE: 'Nhiều đáp án',
  MATCHING: 'Ghép nối',
};
export function TeacherQuestions() {
  const [search, setSearch] = useState(''),
    [type, setType] = useState(''),
    [difficulty, setDifficulty] = useState(''),
    [topic, setTopic] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(''),
    [archive, setArchive] = useState<{ id: string; content: string } | null>(
      null,
    ),
    [notice, setNotice] = useState('');
  const cache = useQueryClient(),
    create = useTeacherAction(),
    duplicate = useTeacherAction();
  const q = useQuery({
    queryKey: ['teacher-questions', search, type, difficulty, topic, page],
    queryFn: () =>
      api.questions(
        new URLSearchParams({
          search,
          type,
          difficulty,
          topic,
          page: String(page),
        }).toString(),
      ),
  });
  async function refresh() {
    await cache.invalidateQueries();
  }
  return (
    <div className="teacher-page">
      <TeacherHeading
        title="Ngân hàng câu hỏi"
        description="Soạn, xem trước và tái sử dụng câu hỏi của bạn. Sửa ngân hàng không thay đổi đề đã xuất bản."
      >
        <a className="admin-primary-link" href="#teacher-create-question">
          + Tạo câu hỏi
        </a>
      </TeacherHeading>
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      <Card id="teacher-create-question" className="teacher-panel">
        <h2>Tạo câu hỏi</h2>
        <fieldset disabled={create.pending}>
          <QuestionForm
            onSubmit={(body) =>
              void create.run(async () => {
                await api.createQuestion(body);
                setNotice('Đã lưu thành công');
                await refresh();
              })
            }
          />
        </fieldset>
        {create.error && <ErrorState error={create.error} />}
      </Card>
      <Card className="teacher-panel">
        <div className="admin-section-title">
          <h2>Danh sách</h2>
          <StatusBadge>Ngân hàng của bạn</StatusBadge>
        </div>
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
          <label>
            Loại câu hỏi
            <select
              aria-label="Lọc loại câu hỏi"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả loại</option>
              {Object.entries(typeNames).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Độ khó
            <select
              aria-label="Lọc độ khó"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả độ khó</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </label>
          <label>
            Chủ đề
            <Input
              aria-label="Lọc chủ đề"
              maxLength={120}
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        {duplicate.error && <ErrorState error={duplicate.error} />}
        <div className="teacher-collection">
          {q.isPending ? (
            <p role="status">Đang tải câu hỏi...</p>
          ) : q.isError ? (
            <ErrorState error={q.error} retry={() => void q.refetch()} />
          ) : !q.data.items.length ? (
            <EmptyState title="Chưa có câu hỏi.">
              Tạo câu hỏi đầu tiên hoặc điều chỉnh bộ lọc.
            </EmptyState>
          ) : (
            q.data.items.map((item) => (
              <article className="teacher-question-row" key={item.id}>
                <div>
                  <StatusBadge tone="primary">
                    {typeNames[item.type]}
                  </StatusBadge>
                  <h3>{item.content}</h3>
                  <p>
                    {item.difficulty} · {item.topic || 'Chưa phân chủ đề'}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <Button
                    variant="outline"
                    onClick={() => setSelected(item.id)}
                  >
                    Xem chi tiết
                  </Button>
                  <Button
                    variant="outline"
                    disabled={duplicate.pending}
                    onClick={() =>
                      void duplicate.run(async () => {
                        await api.duplicateQuestion(item.id);
                        setNotice('Đã nhân bản câu hỏi.');
                        await refresh();
                      })
                    }
                  >
                    Nhân bản
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setArchive({ id: item.id, content: item.content })
                    }
                  >
                    Lưu trữ
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
        {q.data && !q.isError && (
          <Pagination
            page={page}
            total={q.data.total}
            pageCount={q.data.pageCount}
            busy={q.isFetching}
            onPage={setPage}
          />
        )}
      </Card>
      {selected && (
        <div className="teacher-panel">
          <Button variant="ghost" onClick={() => setSelected('')}>
            Đóng chi tiết
          </Button>
          <ManagementDetail key={selected} kind="questions" id={selected} />
        </div>
      )}
      {archive && (
        <ConfirmationDialog
          title="Lưu trữ câu hỏi?"
          description={
            'Câu hỏi ' +
            archive.content.slice(0, 100) +
            ' sẽ bị ẩn khỏi ngân hàng đang dùng. Các snapshot đã xuất bản được giữ nguyên.'
          }
          actionLabel="Lưu trữ câu hỏi"
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            await api.archiveQuestion(archive.id);
            if (selected === archive.id) setSelected('');
            setNotice('Đã lưu trữ câu hỏi');
            await refresh();
          }}
        />
      )}
    </div>
  );
}
