'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { useState } from 'react';
import { NavigationProvider } from './back-navigation';
import { SessionChangeBoundary } from './session-change-boundary';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
      }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <NavigationProvider>
          {children}
          <SessionChangeBoundary />
        </NavigationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
