import { readExamFilters, examContextHref } from '@/lib/management-page-state';
import { ExamPreview } from '@/components/exam-management';
import Link from 'next/link';
import { readPreviewVersion } from '@/lib/exam-preview-selection';

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams,
    listContext = readExamFilters(query, 'list_');
  const selection = readPreviewVersion(query.versionId);
  if ('invalid' in selection)
    return (
      <div className="teacher-page">
        <h1>Liên kết phiên bản không hợp lệ</h1>
        <p role="alert">
          Hãy chọn một phiên bản đã xuất bản. Hệ thống không tự thay phiên bản
          được yêu cầu.
        </p>
        <Link
          href={examContextHref(id, listContext)}
          className="admin-secondary-link"
        >
          Mở bản hiện tại để chọn lại
        </Link>
      </div>
    );
  return (
    <ExamPreview
      key={`${id}:${selection.versionId}`}
      examId={id}
      initialVersionId={selection.versionId}
      listContext={listContext}
    />
  );
}
