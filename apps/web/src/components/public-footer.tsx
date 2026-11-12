import Link from 'next/link';
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <p>
          <strong>ExamSpace</strong> · Không gian thi trực tuyến
        </p>
        <nav aria-label="Điều hướng cuối trang">
          <Link href="/#huong-dan">Hướng dẫn sử dụng</Link>
          <Link href="/login">Đăng nhập</Link>
          <Link href="/#vai-tro">Các vai trò</Link>
        </nav>
      </div>
    </footer>
  );
}
