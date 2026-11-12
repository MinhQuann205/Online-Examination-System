'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { CurrentUser } from '@exam/shared';
import { ArrowLeft } from 'lucide-react';
import {
  InternalNavigation,
  contextualBack,
  allowedRoute,
} from '@/lib/safe-navigation';
import './results/results.css';
import { sessionLifecycle } from '@/lib/session-lifecycle';
import { Button } from './ui/button';

type LeaveGuard = (target: string) => void;
const Context = createContext<{
  back: (fallback?: string, parentOnly?: boolean) => void;
  register: (guard: LeaveGuard) => () => void;
  previous: (fallback?: string) => string;
}>({ back: () => {}, register: () => () => {}, previous: () => '/' });
export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter(),
    client = useQueryClient();
  const history = useRef(new InternalNavigation()),
    guard = useRef<LeaveGuard | null>(null);
  const user = useCallback(() => {
    const query = client.getQueryState<CurrentUser>(['me']);
    return query?.status === 'success' && sessionLifecycle.available()
      ? query.data
      : undefined;
  }, [client]);
  useEffect(() => {
    const record = () =>
      history.current.record(user(), sessionLifecycle.capture(), pathname);
    record();
    return client.getQueryCache().subscribe(record);
  }, [client, pathname, user]);
  const previous = useCallback(
    (fallback?: string) => {
      const actor = user();
      return actor
        ? history.current.previous(
            actor,
            sessionLifecycle.capture(),
            pathname,
            fallback,
          )
        : '/login';
    },
    [pathname, user],
  );
  const back = useCallback(
    (fallback?: string, parentOnly = false) => {
      const actor = user();
      const target =
        parentOnly &&
        actor &&
        fallback &&
        allowedRoute(fallback, actor.role) &&
        !fallback.startsWith('/student/attempts/')
          ? fallback
          : previous(fallback);
      if (guard.current) guard.current(target);
      else router.push(target);
    },
    [previous, router, user],
  );
  const register = useCallback((handler: LeaveGuard) => {
    guard.current = handler;
    return () => {
      if (guard.current === handler) guard.current = null;
    };
  }, []);
  return (
    <Context.Provider value={{ back, register, previous }}>
      {children}
    </Context.Provider>
  );
}
export const usePageNavigation = () => useContext(Context);
export function BackButton({
  fallback,
  label = 'Quay lại',
  onClick,
  disabled = false,
  parentOnly = false,
}: {
  fallback?: string;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  parentOnly?: boolean;
}) {
  const navigation = usePageNavigation();
  return (
    <Button
      type="button"
      variant="outline"
      className="page-back-button mb-4 min-h-11 max-w-full whitespace-normal"
      disabled={disabled}
      onClick={onClick ?? (() => navigation.back(fallback, parentOnly))}
    >
      <ArrowLeft size={17} aria-hidden="true" />
      {label}
    </Button>
  );
}

export function ContextualBackButton({ role }: { role: CurrentUser['role'] }) {
  const pathname = usePathname(),
    context = contextualBack(pathname, role);
  return context ? (
    <div className="contextual-back">
      <BackButton {...context} parentOnly />
    </div>
  ) : null;
}
