import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AnswerAutosave } from '../src/lib/answer-autosave.ts';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
const transport = (save) => ({
  save,
  read: async () => ({ status: 'IN_PROGRESS', answers: [] }),
  isConflict: (error) => error.status === 409,
  isRetryable: () => true,
});

for (const [type, a, b] of [
  ['SINGLE', { optionId: 'A' }, { optionId: 'B' }],
  ['MULTIPLE', { optionIds: ['A'] }, { optionIds: ['B', 'C'] }],
  [
    'MATCHING',
    { pairs: [{ leftId: 'L', rightId: 'A' }] },
    { pairs: [{ leftId: 'L', rightId: 'B' }] },
  ],
]) {
  test(`${type}: three failures of A never restore A over newer B`, async () => {
    const gate = deferred();
    const writes = [];
    const queue = new AnswerAutosave(
      [],
      transport(async (id, revision, answer) => {
        writes.push(answer);
        if (writes.length === 1) await gate.promise;
        if (writes.length <= 3) throw new Error('network');
        return { saved: true, revision };
      }),
      () => {},
      10000,
      [0, 0],
    );
    queue.edit('q', a);
    const saving = queue.flush();
    await tick();
    queue.edit('q', b);
    gate.resolve();
    await saving;
    assert.deepEqual(writes, [a, a, a, b]);
    assert.equal(queue.snapshot().state, 'saved');
    assert.equal(queue.snapshot().questions.q.confirmedVersion, 2);
    queue.dispose();
  });

  test(`${type}: delayed A is followed by B before flush resolves`, async () => {
    const gate = deferred();
    const writes = [];
    const queue = new AnswerAutosave(
      [],
      transport(async (id, revision, answer) => {
        if (!writes.length) await gate.promise;
        writes.push(answer);
        return { saved: true, revision };
      }),
      () => {},
      10000,
    );
    queue.edit('q', a);
    const saving = queue.flush();
    await tick();
    queue.edit('q', b);
    gate.resolve();
    await saving;
    assert.deepEqual(writes, [a, b]);
    queue.dispose();
  });
}

test('reverse response order cannot report saved while another question is pending', async () => {
  const gates = { one: deferred(), two: deferred() };
  const queue = new AnswerAutosave(
    [],
    transport(async (id, revision) => {
      await gates[id].promise;
      return { saved: true, revision };
    }),
    () => {},
    10000,
  );
  queue.edit('one', { optionId: 'A' });
  queue.edit('two', { optionId: 'B' });
  const saving = queue.flush();
  await tick();
  gates.two.resolve();
  await tick();
  assert.equal(queue.snapshot().state, 'saving');
  gates.one.resolve();
  await saving;
  assert.equal(queue.snapshot().state, 'saved');
  queue.dispose();
});

test('another successful question cannot hide an error; manual retry uses latest answer', async () => {
  let offline = true;
  const queue = new AnswerAutosave(
    [],
    transport(async (id, revision) => {
      if (id === 'one' && offline) throw new Error('offline');
      return { saved: true, revision };
    }),
    () => {},
    10000,
    [],
  );
  queue.edit('one', { optionId: 'A' });
  queue.edit('two', { optionId: 'B' });
  await assert.rejects(queue.flush(), /offline/);
  assert.equal(queue.snapshot().state, 'error');
  offline = false;
  await queue.retry();
  assert.equal(queue.snapshot().state, 'saved');
  queue.dispose();
});

test('409 from another tab preserves local edit and requires explicit reconciliation', async () => {
  let revision = 1;
  const writes = [];
  const queue = new AnswerAutosave(
    [],
    {
      ...transport(async (id, next, answer) => {
        writes.push(answer);
        if (next !== revision + 1)
          throw Object.assign(new Error('conflict'), { status: 409 });
        revision = next;
        return { saved: true, revision };
      }),
      read: async () => ({
        status: 'IN_PROGRESS',
        answers: [
          { questionId: 'q', revision, answer: { optionId: 'remote' } },
        ],
      }),
    },
    () => {},
    10000,
  );
  queue.edit('q', { optionId: 'local' });
  await assert.rejects(queue.flush(), /phiên khác/);
  await assert.rejects(queue.retry(), /xác nhận/);
  assert.equal(writes.length, 1);
  await queue.retry(true);
  assert.equal(revision, 2);
  assert.equal(queue.snapshot().state, 'saved');
  queue.dispose();
});
