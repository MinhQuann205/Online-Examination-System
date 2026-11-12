'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MatchingEditor, matchingInputError } from './matching-editor';
export type FormQuestion = {
  type: string;
  content: string;
  difficulty: string;
  topic?: string | null;
  explanation?: string | null;
  options?: Array<{ content: string; isCorrect: boolean }>;
  matchingPairs?: Array<{ leftText: string; rightText: string }>;
};
export function QuestionForm({
  onSubmit,
  initial,
}: {
  onSubmit: (v: Record<string, unknown>) => void;
  initial?: FormQuestion;
}) {
  const [type, setType] = useState(initial?.type ?? 'SINGLE_CHOICE'),
    [content, setContent] = useState(initial?.content ?? ''),
    [explanation, setExplanation] = useState(initial?.explanation ?? ''),
    [topic, setTopic] = useState(initial?.topic ?? ''),
    [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'MEDIUM'),
    [options, setOptions] = useState(
      initial?.options?.map((option) => ({
        content: option.content,
        isCorrect: option.isCorrect,
      })) ?? [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
      ],
    ),
    [pairs, setPairs] = useState(
      initial?.matchingPairs?.map((pair) => ({
        leftText: pair.leftText,
        rightText: pair.rightText,
      })) ?? [
        { leftText: '', rightText: '' },
        { leftText: '', rightText: '' },
      ],
    );
  const [matchingError, setMatchingError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const problem = type === 'MATCHING' ? matchingInputError(pairs) : null;
        setMatchingError(problem);
        if (problem) return;
        onSubmit({
          type,
          content,
          topic,
          difficulty,
          explanation,
          ...(type === 'MATCHING'
            ? {
                matchingPairs: pairs.map((p) => ({
                  leftText: p.leftText.trim(),
                  rightText: p.rightText.trim(),
                })),
              }
            : { options }),
        });
      }}
    >
      <label>
        Nội dung câu hỏi
        <textarea
          aria-label="Nội dung câu hỏi"
          maxLength={10000}
          required
          className="min-h-24 w-full rounded-lg border p-3 dark:bg-slate-900"
          placeholder="Nội dung câu hỏi"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Loại câu hỏi"
          className="h-10 rounded border px-3 dark:bg-slate-900"
          value={type}
          onChange={(e) => {
            const next = e.target.value;
            setType(next);
            if (next === 'SINGLE_CHOICE')
              setOptions((current) =>
                current.map((o, i) => ({ ...o, isCorrect: i === 0 })),
              );
          }}
        >
          <option value="SINGLE_CHOICE">Một đáp án</option>
          <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
          <option value="MATCHING">Ghép nối</option>
        </select>
        <select
          aria-label="Độ khó"
          className="h-10 rounded border px-3 dark:bg-slate-900"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="EASY">Dễ</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Khó</option>
        </select>
        <Input
          className="max-w-xs"
          aria-label="Chủ đề"
          maxLength={120}
          placeholder="Chủ đề"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>
      {type === 'MATCHING' ? (
        <MatchingEditor
          pairs={pairs}
          onChange={(next) => {
            setPairs(next);
            setMatchingError(null);
          }}
          error={matchingError}
        />
      ) : (
        options.map((o, i) => (
          <div key={i} className="flex gap-2">
            <Input
              required
              aria-label={`Lựa chọn ${i + 1}`}
              maxLength={1000}
              placeholder={`Lựa chọn ${i + 1}`}
              value={o.content}
              onChange={(e) =>
                setOptions((a) =>
                  a.map((x, j) =>
                    j === i ? { ...x, content: e.target.value } : x,
                  ),
                )
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type={type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                name="correct"
                checked={o.isCorrect}
                onChange={() =>
                  setOptions((a) =>
                    a.map((x, j) => ({
                      ...x,
                      isCorrect:
                        type === 'SINGLE_CHOICE'
                          ? j === i
                          : j === i
                            ? !x.isCorrect
                            : x.isCorrect,
                    })),
                  )
                }
              />{' '}
              Đúng
            </label>
          </div>
        ))
      )}
      <label>
        Giải thích đáp án
        <textarea
          aria-label="Giải thích đáp án"
          maxLength={5000}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        {type !== 'MATCHING' && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              type === 'MATCHING'
                ? setPairs((p) => [...p, { leftText: '', rightText: '' }])
                : setOptions((o) => [...o, { content: '', isCorrect: false }])
            }
          >
            Thêm dòng
          </Button>
        )}
        <Button>Lưu câu hỏi</Button>
      </div>
    </form>
  );
}
