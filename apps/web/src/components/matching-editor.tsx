'use client';
import { useState } from 'react';
import { ArrowLeftRight, Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import './results/results.css';
export type AuthoringPair = { leftText: string; rightText: string };
export function matchingInputError(pairs: AuthoringPair[]): string | null {
  if (pairs.length < 2) return 'Cần ít nhất hai cặp ghép.';
  if (pairs.some((p) => !p.leftText.trim() || !p.rightText.trim()))
    return 'Mỗi cặp cần đủ nội dung cần ghép và đáp án đúng tương ứng.';
  if (
    pairs.some(
      (p) => p.leftText.trim().length > 500 || p.rightText.trim().length > 500,
    )
  )
    return 'Mỗi phía của một cặp có tối đa 500 ký tự.';
  const left = pairs.map((p) => p.leftText.trim()),
    right = pairs.map((p) => p.rightText.trim());
  if (
    new Set(left).size !== left.length ||
    new Set(right).size !== right.length
  )
    return 'Nội dung cần ghép và đáp án tương ứng phải khác nhau giữa các cặp để tránh câu hỏi mơ hồ.';
  return null;
}
export function MatchingEditor({
  pairs,
  onChange,
  error,
}: {
  pairs: AuthoringPair[];
  onChange: (pairs: AuthoringPair[]) => void;
  error: string | null;
}) {
  const [preview, setPreview] = useState<Array<
    AuthoringPair & { id: string; rightId: string }
  > | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const update = (next: AuthoringPair[]) => {
    setPreview(null);
    setAnswers({});
    onChange(next);
  };
  return (
    <section className="matching-editor" aria-label="Biên soạn cặp ghép đúng">
      <header>
        <h3>Mỗi hàng là một cặp ghép ĐÚNG.</h3>
        <p id="matching-guidance">
          Mỗi hàng là một cặp đáp án đúng. Khi học viên làm bài, các lựa chọn
          bên phải có thể hiển thị theo thứ tự khác. Bạn không cần tự xáo trộn
          đáp án.
        </p>
      </header>
      {pairs.map((pair, index) => (
        <fieldset
          className="matching-author-row"
          key={index}
          aria-describedby="matching-guidance"
        >
          <legend>Cặp {index + 1}</legend>
          <div className="matching-author-fields">
            <label>
              Nội dung cần ghép
              <Input
                aria-label={`Nội dung cần ghép ${index + 1}`}
                placeholder={`Nội dung cần ghép ${index + 1}`}
                required
                maxLength={500}
                value={pair.leftText}
                onChange={(e) =>
                  update(
                    pairs.map((p, i) =>
                      i === index ? { ...p, leftText: e.target.value } : p,
                    ),
                  )
                }
              />
            </label>
            <ArrowLeftRight aria-hidden="true" size={22} />
            <label>
              Đáp án đúng tương ứng
              <Input
                aria-label={`Đáp án đúng tương ứng ${index + 1}`}
                placeholder={`Đáp án đúng tương ứng ${index + 1}`}
                required
                maxLength={500}
                value={pair.rightText}
                onChange={(e) =>
                  update(
                    pairs.map((p, i) =>
                      i === index ? { ...p, rightText: e.target.value } : p,
                    ),
                  )
                }
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              disabled={pairs.length <= 2}
              aria-label={`Xóa cặp ${index + 1}`}
              onClick={() => update(pairs.filter((_, i) => i !== index))}
            >
              <Trash2 size={17} aria-hidden="true" />
              Xóa cặp
            </Button>
          </div>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="results-error">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => update([...pairs, { leftText: '', rightText: '' }])}
      >
        <Plus size={18} aria-hidden="true" />
        Thêm cặp
      </Button>
      <section
        className="matching-key-preview"
        aria-label="Những cặp đáp án được chấm là ĐÚNG"
      >
        <h3>Những cặp đáp án được chấm là ĐÚNG</h3>
        <p>
          Kiểm tra quan hệ từng hàng trước khi lưu. Đây là nội dung đang soạn,
          chưa phải ExamVersion đã xuất bản.
        </p>
        <ul>
          {pairs.map((p, i) => (
            <li key={i}>
              <span>{p.leftText.trim() || 'Chưa nhập nội dung'}</span>
              <span aria-label="tương ứng">↔</span>
              <strong>{p.rightText.trim() || 'Chưa nhập đáp án đúng'}</strong>
            </li>
          ))}
        </ul>
      </section>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (matchingInputError(pairs)) return;
          setAnswers({});
          setPreview(
            pairs.map((p, i) => ({
              ...p,
              id: `preview-left-${i}`,
              rightId: `preview-right-${i}`,
            })),
          );
        }}
        disabled={Boolean(matchingInputError(pairs))}
      >
        <Eye size={18} aria-hidden="true" />
        Xem trước cho học viên
      </Button>
      {preview && (
        <section
          className="matching-student-preview"
          aria-label="Minh họa ghép nối cho học viên"
        >
          <h3>Minh họa ghép nối cho học viên</h3>
          <p>
            Chọn lựa chọn bên phải để thử thao tác. Thứ tự này chỉ minh họa;
            không tạo lượt làm bài, không gửi đáp án và không đổi các cặp đúng.
          </p>
          <div className="matching-preview-grid">
            <div>
              {preview.map((p) => (
                <label key={p.id}>
                  {p.leftText}
                  <select
                    aria-label={`Ghép thử cho ${p.leftText}`}
                    value={answers[p.id] ?? ''}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAnswers((old) => {
                        const out = { ...old, [p.id]: next };
                        for (const id of Object.keys(out))
                          if (id !== p.id && next && out[id] === next)
                            out[id] = old[p.id] ?? '';
                        return out;
                      });
                    }}
                  >
                    <option value="">Chọn cặp tương ứng</option>
                    {[...preview].reverse().map((o) => (
                      <option key={o.rightId} value={o.rightId}>
                        {o.rightText}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div>
              <h4>Lựa chọn bên phải</h4>
              <ul>
                {[...preview].reverse().map((p) => (
                  <li key={p.rightId}>{p.rightText}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
