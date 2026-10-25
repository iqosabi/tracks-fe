import { record } from './guards';
/** hasMore is authoritative in CMS v1.1, even when a page is shorter than the requested limit. */
export function paginationMeta(payload: unknown, page: number, limit: number, count: number) {
  const value = record(payload),
    data = record(value.data);
  const meta = record(value.pagination ?? value.meta ?? data.pagination ?? data.meta ?? value);
  const numeric = (v: unknown) =>
    (typeof v === 'number' || typeof v === 'string') &&
    v !== '' &&
    Number.isSafeInteger(Number(v)) &&
    Number(v) >= 0
      ? Number(v)
      : null;
  const total = numeric(meta.totalItems ?? meta.total ?? value.totalItems ?? value.total);
  const reported = numeric(meta.totalPages ?? value.totalPages);
  const totalPages =
    reported !== null
      ? Math.max(1, reported)
      : total !== null
        ? Math.max(1, Math.ceil(total / limit))
        : null;
  const hasMore = meta.hasMore ?? value.hasMore ?? data.hasMore;
  return {
    total,
    totalPages,
    hasNext:
      typeof hasMore === 'boolean'
        ? hasMore
        : totalPages !== null
          ? page < totalPages
          : count >= limit,
  };
}
