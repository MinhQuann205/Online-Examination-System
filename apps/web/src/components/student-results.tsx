'use client';
import { ResultDetailView } from './results/result-detail';
export { StudentResultsIndex as StudentResults } from './student/student-results-index';
export function StudentResultDetail({ attemptId }: { attemptId: string }) {
  return <ResultDetailView attemptId={attemptId} requiredRole="STUDENT" />;
}
export function TeacherResultDetail({
  attemptId,
  returnHref,
}: {
  attemptId: string;
  returnHref?: string;
}) {
  return (
    <ResultDetailView
      attemptId={attemptId}
      requiredRole="TEACHER"
      returnHref={returnHref}
    />
  );
}
export function AdminResultDetail({
  attemptId,
  returnHref,
}: {
  attemptId: string;
  returnHref?: string;
}) {
  return (
    <ResultDetailView
      attemptId={attemptId}
      requiredRole="ADMIN"
      returnHref={returnHref}
    />
  );
}
