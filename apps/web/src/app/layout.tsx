import localFont from 'next/font/local';
import Script from 'next/script';
import { themeBootstrap } from '@/lib/theme-bootstrap';
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

const jakarta = localFont({
  src: './fonts/PlusJakartaSans.ttf',
  variable: '--font-jakarta',
  weight: '200 800',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ExamSpace',
  description: 'Hệ thống thi trực tuyến',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${jakarta.variable} min-h-screen antialiased`}>
        <Script id="examspace-theme" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
