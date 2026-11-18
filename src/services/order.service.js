import orderRepository from '../repositories/order.repository.js';
import AppError from '../utils/AppError.js';
import { parsePagination, buildPagination } from '../utils/query.utils.js';
import { validateEnum } from '../utils/validation.utils.js';
import { ORDER_STATUS, ORDER_PRIORITY, HTTP_STATUS } from '../constants/index.js';

class OrderService {
  async getOrders({ limit, page, status, priority } = {}) {
    validateEnum(status, ORDER_STATUS, 'Estado');
    validateEnum(priority, ORDER_PRIORITY, 'Prioridad');

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pg = parsePagination({ limit, page });
    const { items, total } = await orderRepository.getAll({ filter, limit: pg.limit, skip: pg.skip });
    return { orders: items, pagination: buildPagination({ total, ...pg }) };
  }

  async getOrderById(id) {
    const order = await orderRepository.getById(id);
    if (!order) throw new AppError(`Pedido ${id} no encontrado`, HTTP_STATUS.NOT_FOUND);
    return order;
  }
}

export default new OrderService();
