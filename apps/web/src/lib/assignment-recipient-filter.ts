type Recipient = {
  fullName: string;
  email: string;
  attempts: Array<{ status: string }>;
};
export function filterRecipients<T extends Recipient>(
  rows: T[],
  search: string,
  status: string,
): T[] {
  const text = search.trim().toLocaleLowerCase('vi');
  return rows.filter((row) => {
    const active = row.attempts.some((a) => a.status === 'IN_PROGRESS'),
      completed =
        !active &&
        row.attempts.some(
          (a) => a.status === 'SUBMITTED' || a.status === 'EXPIRED',
        );
    return (
      (!text ||
        (row.fullName + ' ' + row.email)
          .toLocaleLowerCase('vi')
          .includes(text)) &&
      (status === 'all' ||
        (status === 'not_started' && row.attempts.length === 0) ||
        (status === 'in_progress' && active) ||
        (status === 'completed' && completed))
    );
  });
}
