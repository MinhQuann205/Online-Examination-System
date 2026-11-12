'use client';
import { ResultDetailView } from './results/result-detail';
export { StudentResultsIndex as StudentResults } from './student/student-results-index';
export function StudentResultDetail({ attemptId }: { attemptId: string }) {
  return <ResultDetailView attemptId={attemptId} requiredRole="STUDENT" />;
}
export function TeacherResultDetail({ attemptId }: { attemptId: string }) {
  return <ResultDetailView attemptId={attemptId} requiredRole="TEACHER" />;
}
export function AdminResultDetail({ attemptId }: { attemptId: string }) {
  return <ResultDetailView attemptId={attemptId} requiredRole="ADMIN" />;
}
