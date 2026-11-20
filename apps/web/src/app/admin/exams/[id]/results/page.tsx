import { TeacherExamResults } from '@/components/teacher-results';
import { readReportFilters } from '@/lib/academic-navigation';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params,
    filters = readReportFilters(await searchParams);
  return (
    <TeacherExamResults
      key={JSON.stringify(filters)}
      examId={id}
      role="ADMIN"
      initialFilters={filters}
    />
  );
}
