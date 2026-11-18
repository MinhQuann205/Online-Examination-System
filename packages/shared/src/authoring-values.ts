// datetime-local has no offset. Reject normalized calendar values and local DST
// gaps instead of silently converting a different date/time to UTC.
export function validLocalDateTime(value: string) {
  if (!value) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((x) => Number(x ?? 0));
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return false;
  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second
  );
}

export function validPointText(value: string) {
  return (
    /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value.trim()) &&
    Number(value) > 0 &&
    Number(value) <= 999999.99
  );
}
