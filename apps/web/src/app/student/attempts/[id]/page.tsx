import { AttemptPage } from '@/components/attempt-workspace';

export default async function StudentAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AttemptPage attemptId={id} />;
}
