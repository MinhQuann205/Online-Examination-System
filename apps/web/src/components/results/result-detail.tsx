'use client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, BookOpenCheck, Clock3 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ResultError,
  ResultStatus,
  ResultsHeading,
  resultDate,
  useResultActor,
  type ResultRole,
  type ResultDetail,
  type ResultQuestion,
} from './results-ui';

function MatchingReview({
  question,
  student,
}: {
  question: ResultQuestion;
  student: boolean;
}) {
  const answer = question.answer as {
    pairs?: Array<{ leftId: string; rightId: string }>;
  } | null;
  return (
    <div className="matching-result" aria-label="Chi tiết các cặp ghép">
      {question.matchingPairs.map((pair) => {
        const picked = answer?.pairs?.find(
            (p) => p.leftId === pair.id,
          )?.rightId,
          choice = question.matchingOptions?.find((p) => p.id === picked),
          reveal =
            typeof pair.rightId === 'string' &&
            typeof pair.rightText === 'string';
        return (
          <section
            key={pair.id}
            className="matching-result-pair"
            data-left-id={pair.id}
          >
            <h3>{pair.leftText}</h3>
            <dl>
              <div>
                <dt>{student ? 'Bạn đã chọn' : 'Học viên đã chọn'}</dt>
                <dd>
                  {picked
                    ? (choice?.rightText ?? 'Lựa chọn không khả dụng')
                    : 'Chưa ghép'}
                </dd>
              </div>
              {reveal && (
                <div className="result-correct-key">
                  <dt>Đáp án đúng</dt>
                  <dd>{pair.rightText}</dd>
                </div>
              )}
            </dl>
            {reveal && (
              <p
                className={
                  picked === pair.rightId ? 'result-correct' : 'results-error'
                }
              >
                {!picked
                  ? 'Chưa ghép'
                  : picked === pair.rightId
                    ? 'Đúng'
                    : 'Sai'}
              </p>
            )}
          </section>
        );
      })}
      {question.matchingPairs.some((p) => p.rightId) && (
        <p className="muted">
          Trạng thái từng cặp giúp đối chiếu đáp án. Điểm toàn câu do máy chủ
          trả về; không có điểm riêng từng cặp.
        </p>
      )}
    </div>
  );
}
export function ResultDetailView({
  attemptId,
  requiredRole,
}: {
  attemptId: string;
  requiredRole: ResultRole;
}) {
  const { session, allowed, user } = useResultActor(requiredRole),
    query = useQuery({
      queryKey: ['result', requiredRole, user?.id, attemptId],
      queryFn: async () =>
        (await api.result(attemptId)) as unknown as ResultDetail,
      enabled: allowed,
      retry: false,
      staleTime: 0,
      gcTime: 0,
    });
  if (session.isError)
    return (
      <ResultError error={session.error} retry={() => void session.refetch()} />
    );
  if (!allowed || query.isPending)
    return <p role="status">Đang tải bài làm...</p>;
  if (query.isError)
    return (
      <ResultError error={query.error} retry={() => void query.refetch()} />
    );
  const result = query.data,
    scoreVisible = result.score !== null,
    student = requiredRole === 'STUDENT';
  return (
    <div className="results-page" data-result-id={result.id}>
      <ResultsHeading
        title={result.exam.title}
        description="Kết quả bài thi theo nội dung và đáp án của lượt làm đã hoàn tất."
      >
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Làm mới kết quả
        </Button>
      </ResultsHeading>
      <section className="result-overview" aria-label="Tổng quan kết quả">
        <Card className="result-summary-main">
          <ResultStatus status={result.status} />
          <h2>Kết quả bài thi</h2>
          <dl className="results-meta">
            <div>
              <dt>
                <Clock3 size={17} aria-hidden="true" /> Bắt đầu
              </dt>
              <dd>{resultDate(result.startedAt)}</dd>
            </div>
            <div>
              <dt>Thời điểm nộp</dt>
              <dd>{resultDate(result.submittedAt)}</dd>
            </div>
            <div>
              <dt>Thời lượng đề</dt>
              <dd>
                {result.exam.durationMin === null
                  ? 'Không khả dụng'
                  : `${result.exam.durationMin} phút`}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="result-score-card">
          <BookOpenCheck size={28} aria-hidden="true" />
          <h2>Điểm đạt được</h2>
          <strong>
            {scoreVisible
              ? `${result.score} / ${result.maxScore ?? '—'}`
              : 'Điểm chưa được công bố'}
          </strong>
          {scoreVisible && result.correctCount !== null && (
            <p>
              {result.correctCount} đúng · {result.wrongCount} sai ·{' '}
              {result.unansweredCount} chưa trả lời
            </p>
          )}
          <p>Giữ nguyên thang điểm của lượt làm.</p>
        </Card>
      </section>
      <section
        className="result-questions"
        aria-label="Danh sách câu trả lời chi tiết"
      >
        <header>
          <h2>Danh sách câu trả lời chi tiết</h2>
          <p className="muted">
            Đáp án đúng và giải thích chỉ xuất hiện khi được phép xem. Điểm và
            đáp án được công bố độc lập.
          </p>
        </header>
        {result.questions.map((q, index) => {
          const answer = q.answer as {
              optionId?: string;
              optionIds?: string[];
            } | null,
            selected = new Set([
              ...(answer?.optionId ? [answer.optionId] : []),
              ...(answer?.optionIds ?? []),
            ]),
            keyVisible = q.options.some(
              (o) => typeof o.isCorrect === 'boolean',
            );
          return (
            <Card
              key={q.questionId}
              className="result-question"
              data-question-id={q.questionId}
            >
              <div className="result-question-heading">
                <span className="result-number">{index + 1}</span>
                <span className="muted">
                  {q.type === 'MATCHING'
                    ? 'Ghép nối'
                    : q.type === 'MULTIPLE_CHOICE'
                      ? 'Nhiều đáp án'
                      : 'Một đáp án'}
                </span>
                {scoreVisible && q.awarded !== null && (
                  <span className="result-award">
                    {q.awarded} / {q.points} điểm
                  </span>
                )}
              </div>
              <h2>
                Câu {index + 1}. {q.content}
              </h2>
              {q.type === 'MATCHING' ? (
                <MatchingReview question={q} student={student} />
              ) : (
                <div className="result-options">
                  {q.options.map((option) => (
                    <div
                      className={`result-option ${option.isCorrect === true ? 'is-correct' : ''} ${selected.has(option.id) ? 'is-selected' : ''}`}
                      key={option.id}
                    >
                      <span>
                        {option.isCorrect === true ? (
                          <CheckCircle2 size={18} aria-label="Đáp án đúng" />
                        ) : selected.has(option.id) ? (
                          '●'
                        ) : (
                          '○'
                        )}
                      </span>
                      <span>{option.content}</span>
                      <div>
                        {selected.has(option.id) && (
                          <strong>
                            {student ? 'Bạn đã chọn' : 'Học viên đã chọn'}
                          </strong>
                        )}
                        {keyVisible && option.isCorrect === true && (
                          <span>Đáp án đúng</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {q.explanation && (
                <section
                  className="result-explanation"
                  aria-label={`Giải thích câu ${index + 1}`}
                >
                  <h3>Giải thích</h3>
                  <p>{q.explanation}</p>
                </section>
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
