export type AcademicSummary = {
  finalized: number;
  submitted: number;
  expired: number;
  scores: {
    availability: 'NO_SCORES' | 'AVAILABLE' | 'MIXED_SCALES';
    gradedAttempts: number;
    average: string | null;
    minimum: string | null;
    maximum: string | null;
    scale: string | null;
  };
};
export type AcademicReport = {
  exam: { id: string; title: string };
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  summary: AcademicSummary;
  population: 'FINALIZED_HISTORICAL_ATTEMPTS';
  items: Array<{
    id: string;
    status: 'SUBMITTED' | 'EXPIRED';
    assignmentId: string;
    examVersionId: string | null;
    examVersion: number;
    startedAt: string;
    submittedAt: string | null;
    score: string | null;
    maxScore: string | null;
    student: { id: string; fullName: string; email: string; isActive: boolean };
    class: { id: string; name: string } | null;
    exam: {
      title: string;
      durationMin: number | null;
      metadataAvailable: boolean;
    };
  }>;
};
