export function paginate(items, { page = 1, pageSize = 20 } = {}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(page)) throw new TypeError('Invalid pagination');
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(pages, Math.max(1, page));
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pages, total: items.length, hasNext: current < pages, hasPrevious: current > 1 };
}
