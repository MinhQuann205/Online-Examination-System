import { StudentResultsIndex } from '@/components/student/student-results-index';
import { readHistoryFilters } from '@/lib/management-page-state';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readHistoryFilters(await searchParams);
  return (
    <StudentResultsIndex
      key={JSON.stringify(filters)}
      initialFilters={filters}
    />
  );
}
