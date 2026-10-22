/* eslint-disable @typescript-eslint/no-explicit-any */
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
  users: (params: string) =>
    request<{
      items: Array<Record<string, unknown>>;
      total: number;
      pageCount: number;
    }>(`/users?${params}`),
  createUser: (body: unknown) =>
    request<Record<string, unknown>>('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setUserStatus: (id: string, isActive: boolean) =>
    request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  resetUserPassword: (id: string) =>
    request<{ temporaryPassword: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
    }),
  classes: () => request<{ items: Array<Record<string, any>> }>('/classes'),
  createClass: (body: unknown) =>
    request('/classes', { method: 'POST', body: JSON.stringify(body) }),
  classDetail: (id: string) => request<Record<string, any>>(`/classes/${id}`),
  updateClass: (id: string, body: unknown) =>
    request(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addStudent: (id: string, studentId: string) =>
    request(`/classes/${id}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    }),
  removeStudent: (id: string, studentId: string) =>
    request(`/classes/${id}/students/${studentId}`, { method: 'DELETE' }),
  questions: (params: string) =>
    request<{
      items: Array<Record<string, any>>;
      total: number;
      pageCount: number;
    }>(`/questions?${params}`),
  createQuestion: (body: unknown) =>
    request('/questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: unknown) =>
    request(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  archiveQuestion: (id: string) =>
    request(`/questions/${id}`, { method: 'DELETE' }),
  duplicateQuestion: (id: string) =>
    request(`/questions/${id}/duplicate`, { method: 'POST' }),
};
