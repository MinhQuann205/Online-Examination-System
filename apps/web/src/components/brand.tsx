import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ExamSpace — Trang chủ">
      <span className="brand-mark">
        <GraduationCap size={25} aria-hidden="true" />
      </span>
      <span>
        <strong>ExamSpace</strong>
        <small>Không gian thi trực tuyến</small>
      </span>
    </Link>
  );
}
