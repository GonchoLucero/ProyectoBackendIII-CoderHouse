import { PAGINATION } from '../constants/index.js';
import { InvalidPaginationError } from '../errors/index.js';

export const pick = (obj = {}, fields = []) =>
  Object.fromEntries(Object.entries(obj).filter(([key]) => fields.includes(key)));

const parsePositiveInt = (param, value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new InvalidPaginationError(param, value);
  return n;
};

export const parsePagination = ({ limit, page } = {}) => {
  const safeLimit = Math.min(parsePositiveInt('limit', limit, PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT);
  const safePage = parsePositiveInt('page', page, 1);
  return { limit: safeLimit, page: safePage, skip: (safePage - 1) * safeLimit };
};

export const buildPagination = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
});
