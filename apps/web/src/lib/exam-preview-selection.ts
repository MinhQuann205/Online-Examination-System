import { z } from 'zod';
export function readPreviewVersion(value: string | string[] | undefined) {
  if (value === undefined) return { versionId: '' };
  const parsed = z.uuid().safeParse(value);
  return parsed.success
    ? { versionId: parsed.data }
    : { invalid: true as const };
}
export function examPreviewHref(examId: string, versionId: string) {
  if (
    !z.uuid().safeParse(examId).success ||
    (versionId && !z.uuid().safeParse(versionId).success)
  )
    return null;
  return (
    `/teacher/exams/${examId}` +
    (versionId ? '?' + new URLSearchParams({ versionId }).toString() : '')
  );
}
