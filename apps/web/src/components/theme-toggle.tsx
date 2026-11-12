'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label="Đổi giao diện sáng tối"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun size={19} className="hidden dark:block" aria-hidden="true" />
      <Moon size={19} className="dark:hidden" aria-hidden="true" />
    </button>
  );
}
