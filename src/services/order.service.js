import orderRepository from '../repositories/order.repository.js';
import { OrderNotFoundError, InvalidStatusError, InvalidPriorityError } from '../errors/index.js';
import { parsePagination, buildPagination } from '../utils/query.utils.js';
import { validateEnum } from '../utils/validation.utils.js';
import { ORDER_STATUS, ORDER_PRIORITY } from '../constants/index.js';

class OrderService {
  async getOrders({ limit, page, status, priority } = {}) {
    validateEnum(status, ORDER_STATUS, InvalidStatusError);
    validateEnum(priority, ORDER_PRIORITY, InvalidPriorityError);

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pg = parsePagination({ limit, page });
    const { items, total } = await orderRepository.getAll({ filter, limit: pg.limit, skip: pg.skip });
    return { orders: items, pagination: buildPagination({ total, ...pg }) };
  }

  async getOrderById(id) {
    const order = await orderRepository.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  }
}

export default new OrderService();
