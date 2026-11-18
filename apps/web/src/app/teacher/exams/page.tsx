import { ExamList } from '@/components/exam-management';
import { readExamFilters } from '@/lib/management-page-state';
export default async function TeacherExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readExamFilters(await searchParams);
  return <ExamList key={JSON.stringify(filters)} initialFilters={filters} />;
}
