import { NextResponse } from 'next/server';

// Discard the body without parsing or logging credentials on native submission.
export function POST() {
  return new NextResponse(
    'Vui lòng bật JavaScript và mở lại trang đăng nhập.',
    {
      status: 400,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
