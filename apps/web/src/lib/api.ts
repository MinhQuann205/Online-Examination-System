import type { CurrentUser } from '@exam/shared';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (
    response.status === 401 &&
    retry &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
    const refreshed = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) return request<T>(path, init, false);
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      typeof data.message === 'string'
        ? data.message
        : `Request failed (${response.status})`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<CurrentUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<CurrentUser>('/auth/me'),
  dashboard: (role: Lowercase<CurrentUser['role']>) =>
    request<{ user: CurrentUser; section: string }>(`/dashboard/${role}`),
  logout: () => request<void>('/auth/logout', { method: 'POST' }, false),
};
