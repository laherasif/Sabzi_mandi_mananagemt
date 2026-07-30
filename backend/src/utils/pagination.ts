export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  search?: string;
}

export function parsePagination(query: PaginationQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = query.sort || '-createdAt';
  const search = (query.search || '').trim();
  return { page, limit, skip, sort, search };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}
