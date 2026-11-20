'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FormQuestion } from '@/components/question-form';
import { ErrorState } from './teacher-ui';
export function QuestionBankPreview({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ['bank-preview', id],
    queryFn: async () => (await api.question(id)) as FormQuestion,
  });
  return (
    <Card className="p-4" aria-label="Xem trước câu hỏi ngân hàng">
      <div className="admin-section-title">
        <h3>Xem trước câu hỏi</h3>
        <Button type="button" variant="outline" onClick={onClose}>
          Đóng xem trước
        </Button>
      </div>
      {q.isPending ? (
        <p role="status">Đang tải câu hỏi...</p>
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <p className="whitespace-pre-wrap">{q.data.content}</p>
          <p className="muted">
            {q.data.topic ?? 'Chưa có chủ đề'} · {q.data.difficulty}
          </p>
          {q.data.type === 'MATCHING' ? (
            <dl>
              {q.data.matchingPairs?.map((p, i) => (
                <div key={i}>
                  <dt>{p.leftText}</dt>
                  <dd>↔ {p.rightText}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <ul>
              {q.data.options?.map((o, i) => (
                <li key={i}>
                  {o.content}
                  {o.isCorrect ? ' · Đáp án đúng' : ''}
                </li>
              ))}
            </ul>
          )}
          {q.data.explanation && (
            <p className="whitespace-pre-wrap">
              Giải thích: {q.data.explanation}
            </p>
          )}
          <p className="muted">
            Bản hiện tại trong ngân hàng. Xem trước không sửa câu hỏi hoặc
            snapshot đã phát hành.
          </p>
        </>
      )}
    </Card>
  );
}
