// Selects must include records beyond page one. Each request stays within API limits.
export async function allPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; pageCount: number }>,
): Promise<T[]> {
  const first = await fetchPage(1);
  const items = [...first.items];
  for (let page = 2; page <= first.pageCount; page++)
    items.push(...(await fetchPage(page)).items);
  return items;
}
