import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const url = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function client() {
  const lifecycle = ts.transpileModule(
    fs.readFileSync(
      new URL('../src/lib/session-lifecycle.ts', import.meta.url),
      'utf8',
    ),
    { compilerOptions: { module: ts.ModuleKind.ESNext } },
  ).outputText;
  const source = fs
    .readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
    .replace(
      "'./session-lifecycle'",
      JSON.stringify(url(lifecycle + `\n// ${Math.random()}`)),
    );
  return (
    await import(
      url(
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.ESNext },
        }).outputText,
      )
    )
  ).api;
}
function deferred() {
  let resolve;
  return {
    promise: new Promise((r) => (resolve = r)),
    resolve: (value) => resolve(value),
  };
}
const safeUser = {
  id: 'unit-only',
  email: 'unit@example.test',
  fullName: 'Unit',
  role: 'STUDENT',
};
test('delayed private JSON cannot return after login changes the account', async () => {
  const api = await client(),
    body = deferred(),
    arrived = deferred();
  const original = globalThis.fetch;
  globalThis.fetch = async (endpoint) =>
    String(endpoint).endsWith('/auth/login')
      ? Response.json(safeUser)
      : {
          ok: true,
          status: 200,
          json: () => {
            arrived.resolve();
            return body.promise;
          },
        };
  try {
    const privateRequest = api.me();
    const rejected = assert.rejects(privateRequest, /phiên trước/);
    await arrived.promise;
    await api.login('unit@example.test', 'dummy');
    body.resolve(safeUser);
    await rejected;
  } finally {
    globalThis.fetch = original;
  }
});
test('logout waits for an already running refresh before it clears cookies', async () => {
  const api = await client(),
    refresh = deferred(),
    started = deferred(),
    calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (endpoint) => {
    const route = new URL(endpoint).pathname;
    calls.push(route);
    if (route === '/auth/me') return new Response('', { status: 401 });
    if (route === '/auth/refresh') {
      started.resolve();
      return refresh.promise;
    }
    return new Response(null, { status: 204 });
  };
  try {
    const me = api.me();
    const rejected = assert.rejects(me, /phiên trước/);
    await started.promise;
    const logout = api.logout();
    await Promise.resolve();
    assert(!calls.includes('/auth/logout'));
    refresh.resolve(Response.json(safeUser));
    await logout;
    await rejected;
    assert.equal(calls.at(-1), '/auth/logout');
  } finally {
    globalThis.fetch = original;
  }
});
test('CSRF failure stays an ApiError and a failed logout can be retried', async () => {
  const api = await client();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 1
      ? Response.json({ message: 'Untrusted request origin' }, { status: 403 })
      : new Response(null, { status: 204 });
  try {
    await assert.rejects(api.logout(), (e) => e.status === 403);
    await api.logout();
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test('a stalled refresh times out before logout proceeds, without overlapping cookie mutations', async () => {
  const api = await client(),
    started = deferred(),
    calls = [],
    controller = new AbortController();
  const originalFetch = globalThis.fetch,
    originalTimeout = AbortSignal.timeout;
  AbortSignal.timeout = (milliseconds) => {
    assert.equal(milliseconds, 15_000);
    return controller.signal;
  };
  globalThis.fetch = async (endpoint, options) => {
    const route = new URL(endpoint).pathname;
    calls.push(route);
    if (route === '/auth/me') return new Response('', { status: 401 });
    if (route === '/auth/refresh') {
      started.resolve();
      return new Promise((_, reject) =>
        options.signal.addEventListener(
          'abort',
          () => reject(options.signal.reason),
          { once: true },
        ),
      );
    }
    assert(controller.signal.aborted, 'logout must follow the refresh abort');
    return new Response(null, { status: 204 });
  };
  try {
    const me = api.me();
    const rejected = assert.rejects(
      me,
      (error) => error.name === 'TimeoutError',
    );
    await started.promise;
    const logout = api.logout();
    await Promise.resolve();
    assert(!calls.includes('/auth/logout'));
    controller.abort(new DOMException('Test timeout', 'TimeoutError'));
    await logout;
    await rejected;
    assert.equal(calls.at(-1), '/auth/logout');
  } finally {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
  }
});
