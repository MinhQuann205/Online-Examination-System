import { StudentExams } from '@/components/student-exams';
import { readStudentOperationContext } from '@/lib/examination-operations';
import { readStudentExamView } from '@/lib/student-exam-views';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams,
    view = readStudentExamView(query.view),
    context = readStudentOperationContext(query);
  return (
    <StudentExams
      key={view + JSON.stringify(context)}
      initialView={view}
      initialContext={context}
    />
  );
}
