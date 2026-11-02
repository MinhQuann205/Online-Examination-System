export type SavePhase = 'DIRTY' | 'PENDING' | 'SAVING' | 'SAVED' | 'ERROR';

export type SaveSnapshot = {
  state: 'saved' | 'saving' | 'error';
  message: string;
  hasConflict: boolean;
  questions: Record<
    string,
    { phase: SavePhase; editVersion: number; confirmedVersion: number }
  >;
};

type Draft<T> = { answer: T; editVersion: number };
type Write<T> = Draft<T> & { revision: number };
type Entry<T> = {
  revision: number;
  editVersion: number;
  confirmedVersion: number;
  dirty?: Draft<T>;
  flight?: Write<T>;
  timer?: ReturnType<typeof setTimeout>;
  work?: Promise<void>;
  error?: Error;
  conflict: boolean;
  ownWrites: Write<T>[];
};

export type AutosaveTransport<T> = {
  save: (
    questionId: string,
    revision: number,
    answer: T,
  ) => Promise<{ saved: boolean; revision?: number }>;
  read: () => Promise<{
    status: string;
    answers: Array<{ questionId: string; revision: number; answer: unknown }>;
  }>;
  isConflict: (error: unknown) => boolean;
  isRetryable: (error: unknown) => boolean;
};

function sameAnswer(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => sameAnswer(value, right[index]))
    );
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const a = left as Record<string, unknown>,
      b = right as Record<string, unknown>;
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && sameAnswer(a[key], b[key]))
    );
  }
  return false;
}

export class AnswerAutosave<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private disposed = false;
  private readonly transport: AutosaveTransport<T>;
  private readonly publish: (snapshot: SaveSnapshot) => void;
  private readonly debounceMs: number;
  private readonly retryDelays: number[];

  constructor(
    initial: Array<{ questionId: string; revision: number }>,
    transport: AutosaveTransport<T>,
    publish: (snapshot: SaveSnapshot) => void,
    debounceMs = 600,
    retryDelays = [300, 600],
  ) {
    this.transport = transport;
    this.publish = publish;
    this.debounceMs = debounceMs;
    this.retryDelays = retryDelays;
    for (const row of initial)
      this.entry(row.questionId).revision = row.revision;
  }

  private entry(id: string): Entry<T> {
    let entry = this.entries.get(id);
    if (!entry) {
      entry = {
        revision: 0,
        editVersion: 0,
        confirmedVersion: 0,
        conflict: false,
        ownWrites: [],
      };
      this.entries.set(id, entry);
    }
    return entry;
  }

  snapshot(): SaveSnapshot {
    const entries = [...this.entries.entries()];
    const error = entries.find(([, value]) => value.error)?.[1].error;
    const pending = entries.some(
      ([, value]) =>
        value.dirty ||
        value.flight ||
        value.timer ||
        value.confirmedVersion < value.editVersion,
    );
    return {
      state: error ? 'error' : pending ? 'saving' : 'saved',
      message: error?.message ?? '',
      hasConflict: entries.some(([, value]) => value.conflict),
      questions: Object.fromEntries(
        entries.map(([id, value]) => [
          id,
          {
            phase: value.error
              ? 'ERROR'
              : value.flight
                ? 'SAVING'
                : value.timer
                  ? 'PENDING'
                  : value.dirty
                    ? 'DIRTY'
                    : 'SAVED',
            editVersion: value.editVersion,
            confirmedVersion: value.confirmedVersion,
          },
        ]),
      ),
    };
  }

  private emit() {
    if (!this.disposed) this.publish(this.snapshot());
  }

  edit(id: string, answer: T) {
    if (this.disposed) return;
    const entry = this.entry(id);
    entry.editVersion += 1;
    entry.dirty = {
      answer: structuredClone(answer),
      editVersion: entry.editVersion,
    };
    if (!entry.conflict) entry.error = undefined;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      void this.drain(id);
    }, this.debounceMs);
    this.emit();
  }

  private async send(id: string, entry: Entry<T>, draft: Draft<T>) {
    let reconciliations = 0;
    let retry = 0;
    for (;;) {
      const write = { ...draft, revision: entry.revision + 1 };
      entry.flight = write;
      entry.ownWrites.push(write);
      entry.ownWrites = entry.ownWrites.slice(-30);
      this.emit();
      try {
        const result = await this.transport.save(
          id,
          write.revision,
          structuredClone(write.answer),
        );
        if (!result.saved)
          throw new Error(
            'Thời gian làm bài đã kết thúc. Đáp án này chưa được lưu.',
          );
        if (result.revision !== write.revision)
          throw new Error('Máy chủ chưa xác nhận đúng phiên bản đáp án.');
        entry.revision = result.revision;
        return;
      } catch (error) {
        if (this.transport.isConflict(error)) {
          const remote = await this.transport.read();
          if (remote.status !== 'IN_PROGRESS')
            throw new Error(
              'Lượt làm bài đã kết thúc. Không thể lưu thêm đáp án.',
            );
          const row = remote.answers.find((value) => value.questionId === id);
          const revision = row?.revision ?? 0;
          const knownWrite =
            row &&
            entry.ownWrites.some(
              (value) =>
                value.revision === revision &&
                sameAnswer(value.answer, row.answer),
            );
          if (knownWrite && revision >= entry.revision) {
            entry.revision = revision;
            if (sameAnswer(row.answer, draft.answer)) return;
            // Rebase only over an acknowledged payload this coordinator actually sent.
            if (reconciliations++ < 2) {
              retry = 0;
              continue;
            }
          }
          entry.conflict = true;
          throw new Error(
            'Đáp án đã thay đổi ở phiên khác. Kiểm tra lựa chọn rồi xác nhận lưu lại để đồng bộ.',
          );
        }
        if (
          !this.transport.isRetryable(error) ||
          retry >= this.retryDelays.length
        )
          throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelays[retry++]),
        );
      }
    }
  }

  private drain(id: string): Promise<void> {
    const entry = this.entry(id);
    if (entry.work) return entry.work;
    if (this.disposed || entry.conflict || !entry.dirty)
      return Promise.resolve();
    const work = Promise.resolve()
      .then(async () => {
        while (entry.dirty && !entry.conflict && !this.disposed) {
          if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = undefined;
          }
          const draft = entry.dirty;
          entry.dirty = undefined;
          entry.error = undefined;
          try {
            await this.send(id, entry, draft);
            entry.confirmedVersion = draft.editVersion;
            entry.error = undefined;
          } catch (error) {
            // Never restore an older draft over an edit made while its request was in flight.
            if (!entry.dirty && entry.editVersion === draft.editVersion)
              entry.dirty = draft;
            if (entry.conflict || entry.editVersion === draft.editVersion) {
              entry.error =
                error instanceof Error
                  ? error
                  : new Error('Không thể lưu câu trả lời.');
              break;
            }
          } finally {
            entry.flight = undefined;
            this.emit();
          }
        }
      })
      .finally(() => {
        entry.work = undefined;
        this.emit();
      });
    entry.work = work;
    return work;
  }

  async retry(confirmConflicts = false) {
    const conflicts = [...this.entries.entries()].filter(
      ([, entry]) => entry.conflict,
    );
    if (conflicts.length) {
      if (!confirmConflicts)
        throw new Error('Cần xác nhận trước khi đồng bộ đáp án xung đột.');
      const remote = await this.transport.read();
      if (remote.status !== 'IN_PROGRESS')
        throw new Error('Lượt làm bài đã kết thúc.');
      for (const [id, entry] of conflicts) {
        entry.revision =
          remote.answers.find((row) => row.questionId === id)?.revision ?? 0;
        entry.conflict = false;
        entry.error = undefined;
      }
    }
    for (const entry of this.entries.values()) entry.error = undefined;
    await this.flush();
  }

  async flush() {
    for (const entry of this.entries.values()) {
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = undefined;
      }
    }
    await Promise.all([...this.entries.keys()].map((id) => this.drain(id)));
    const snapshot = this.snapshot();
    if (snapshot.state !== 'saved')
      throw new Error(
        snapshot.message || 'Còn đáp án chưa được máy chủ xác nhận.',
      );
  }

  dispose() {
    this.disposed = true;
    for (const entry of this.entries.values())
      if (entry.timer) clearTimeout(entry.timer);
  }
}
