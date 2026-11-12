/* eslint-disable @typescript-eslint/no-explicit-any */
import { sessionDocumentId, sessionLifecycle } from './session-lifecycle';
import type { CurrentUser } from '@exam/shared';

export type ExamAssignment = {
  id: string;
  examId: string;
  classId: string | null;
  studentId: string | null;
  opensAt: string | null;
  closesAt: string | null;
  maxAttempts: number;
  showScore: boolean;
  showAnswers: boolean;
  exam: {
    id: string;
    title: string;
    status: string;
    durationMin: number | null;
    metadataAvailable: boolean;
  };
  examVersion: { id: string; number: number; publishedAt: string } | null;
  class: { id: string; name: string; code: string } | null;
  student: { id: string; fullName: string; email: string } | null;
  _count: { attempts: number };
  attempts?: Array<{
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
    startedAt: string;
    submittedAt: string | null;
  }>;
};

export type AttemptRecord = {
  reviewQuestionIds: string[];
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  version: number;
  snapshot: {
    title: string;
    description: string | null;
    durationMin: number;
    questions: Array<{
      questionId: string;
      type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING';
      content: string;
      position: number;
      points: number;
      options: Array<{ id: string; content: string }>;
      matchingPairs: Array<{ id: string; leftText: string }>;
      matchingOptions: Array<{ id: string; rightText: string }>;
    }>;
  };
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  answers: Array<{ questionId: string; answer: unknown; revision: number }>;
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let refreshInFlight: Promise<boolean> | undefined;
let refreshGeneration = 0;

function refreshSession() {
  if (!sessionLifecycle.available()) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      // Bound the refresh that account changes must wait for.
      signal: AbortSignal.timeout(15_000),
    })
      .then((response) => {
        if (response.ok) refreshGeneration++;
        return response.ok;
      })
      .finally(() => {
        refreshInFlight = undefined;
      });
  }
  return refreshInFlight;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  accountChange = false,
): Promise<T> {
  const generation = refreshGeneration;
  const session = sessionLifecycle.capture();
  if (!accountChange) sessionLifecycle.assertCurrent(session);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!accountChange) sessionLifecycle.assertCurrent(session);
  if (
    response.status === 401 &&
    retry &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
    const refreshed =
      generation !== refreshGeneration || (await refreshSession());
    sessionLifecycle.assertCurrent(session);
    if (refreshed) return request<T>(path, init, false);
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!accountChange) sessionLifecycle.assertCurrent(session);
    throw new ApiError(
      typeof data.message === 'string'
        ? data.message
        : `Request failed (${response.status})`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  const data = (await response.json()) as T;
  if (!accountChange) sessionLifecycle.assertCurrent(session);
  return data;
}

async function changeAccount<T>(path: string, init: RequestInit): Promise<T> {
  sessionLifecycle.begin();
  try {
    // Let an older refresh finish setting its cookie before login/logout writes it.
    await refreshInFlight?.catch(() => false);
    const result = await request<T>(
      path,
      { ...init, signal: AbortSignal.timeout(15_000) },
      false,
      true,
    );
    if (
      typeof window !== 'undefined' &&
      typeof BroadcastChannel !== 'undefined'
    ) {
      const channel = new BroadcastChannel('examspace-account-v1');
      channel.postMessage({
        type: 'account-changed',
        sender: sessionDocumentId,
      });
      channel.close();
    }
    return result;
  } finally {
    sessionLifecycle.finish();
  }
}

export const api = {
  user: (id: string) => request<Record<string, any>>(`/users/${id}`),
  updateUser: (id: string, body: unknown) =>
    request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  question: (id: string) => request<Record<string, any>>(`/questions/${id}`),
  examVersions: (id: string) =>
    request<Array<{ id: string; number: number; publishedAt: string }>>(
      `/exams/${id}/versions`,
    ),
  markReview: (id: string, questionId: string, marked: boolean) =>
    request<{ saved: boolean; reviewQuestionIds: string[] }>(
      `/exam-attempts/${id}/review/${questionId}`,
      { method: 'PUT', body: JSON.stringify({ marked }) },
    ),
  login: (email: string, password: string) =>
    changeAccount<CurrentUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<CurrentUser>('/auth/me'),
  dashboard: (role: Lowercase<CurrentUser['role']>) =>
    request<{ user: CurrentUser; section: string }>(`/dashboard/${role}`),
  logout: () => changeAccount<void>('/auth/logout', { method: 'POST' }),
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
  classes: (params = '') =>
    request<{
      items: Array<Record<string, any>>;
      total: number;
      pageCount: number;
    }>(`/classes?${params}`),
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
  exams: (params = '') =>
    request<{ items: any[]; total: number; page: number; pageCount: number }>(
      `/exams${params ? `?${params}` : ''}`,
    ),
  exam: (id: string) => request<any>(`/exams/${id}`),
  examPreview: (id: string) => request<any>(`/exams/${id}/preview`),
  createExam: (body: unknown) =>
    request<{ id: string }>('/exams', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateExam: (id: string, body: unknown) =>
    request<{ id: string }>(`/exams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  publishExam: (id: string) =>
    request(`/exams/${id}/publish`, { method: 'POST' }),
  newExamVersion: (id: string) =>
    request(`/exams/${id}/new-version`, { method: 'POST' }),
  archiveExam: (id: string) =>
    request(`/exams/${id}/archive`, { method: 'POST' }),
  examAssignments: (params = '') =>
    request<{
      items: ExamAssignment[];
      total: number;
      page: number;
      pageCount: number;
    }>(`/exam-assignments${params ? `?${params}` : ''}`),
  createExamAssignment: (body: unknown) =>
    request<ExamAssignment>('/exam-assignments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateExamAssignment: (id: string, body: unknown) =>
    request<ExamAssignment>(`/exam-assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  examAssignmentStudents: (id: string) =>
    request<
      Array<{
        id: string;
        fullName: string;
        email: string;
        attempts: Array<{
          id: string;
          status: string;
          startedAt: string;
          submittedAt: string | null;
          score: string | null;
        }>;
      }>
    >(`/exam-assignments/${id}/students`),
  startAttempt: (assignmentId: string) =>
    request<AttemptRecord>(`/exam-assignments/${assignmentId}/start`, {
      method: 'POST',
    }),
  attempt: (id: string) =>
    request<AttemptRecord>(`/exam-attempts/${id}`, {
      signal: AbortSignal.timeout(15_000),
    }),
  saveAttemptAnswer: (
    attemptId: string,
    questionId: string,
    revision: number,
    answer: unknown,
  ) =>
    request<{ saved: boolean; revision?: number; status?: string }>(
      `/exam-attempts/${attemptId}/answers/${questionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ revision, answer }),
        signal: AbortSignal.timeout(15_000),
      },
    ),
  submitAttempt: (id: string) =>
    request<AttemptRecord>(`/exam-attempts/${id}/submit`, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
    }),
  studentResults: () =>
    request<{
      items: Array<Record<string, unknown>>;
      total: number;
      pageCount: number;
    }>('/results?page=1'),
  studentResultsPage: (page: number) =>
    request<{
      items: Array<Record<string, unknown>>;
      total: number;
      pageCount: number;
    }>(`/results?page=${page}`),
  result: (id: string) => request<Record<string, unknown>>(`/results/${id}`),
  examResults: (id: string) =>
    request<Record<string, unknown>>(`/results/exams/${id}`),
};
