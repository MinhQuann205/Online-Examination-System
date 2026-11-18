const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function managementId(value: unknown): string {
  return typeof value === 'string' && uuid.test(value) ? value : '';
}
export function managementHref(kind: 'users' | 'classes', id: string): string {
  const safe = managementId(id);
  return (
    '/admin/' +
    kind +
    (safe ? '?' + (kind === 'users' ? 'userId' : 'classId') + '=' + safe : '')
  );
}
