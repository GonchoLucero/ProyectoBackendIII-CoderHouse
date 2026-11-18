import { PAGINATION } from '../constants/index.js';

export const pick = (obj = {}, fields = []) =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => fields.includes(key)));

export const parsePagination = ({ limit, page } = {}) => {
  const safeLimit = Math.min(Number(limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const safePage = Math.max(Number(page) || 1, 1);
  return { limit: safeLimit, page: safePage, skip: (safePage - 1) * safeLimit };
};

export const buildPagination = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
});
