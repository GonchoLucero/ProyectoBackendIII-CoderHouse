import crypto from 'node:crypto';
import orderRepository from '../repositories/order.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import userRepository from '../repositories/user.repository.js';
import logger from '../config/logger.js';
import {
  AppError,
  OrderNotFoundError,
  UserNotFoundError,
  InvalidStatusError,
  InvalidPriorityError,
  MissingFieldsError,
  ValidationError,
} from '../errors/index.js';
import { parsePagination, buildPagination } from '../utils/query.utils.js';
import { validateEnum } from '../utils/validation.utils.js';
import { ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, USER_ROLES } from '../constants/index.js';

const ADDRESS_FIELDS = ['street', 'city', 'province', 'zipCode'];

const randomCode = (prefix, bytes) => `${prefix}-${crypto.randomBytes(bytes).toString('hex').toUpperCase()}`;

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('El pedido debe tener al menos un ítem', { field: 'items' });
  }
  items.forEach((item, i) => {
    if (!item?.title || typeof item.title !== 'string') {
      throw new ValidationError(`El ítem ${i} necesita un título`, { field: `items[${i}].title` });
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ValidationError(`La cantidad del ítem ${i} debe ser un entero mayor a 0`, {
        field: `items[${i}].quantity`,
        value: item.quantity,
      });
    }
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
      throw new ValidationError(`El precio del ítem ${i} debe ser un número mayor o igual a 0`, {
        field: `items[${i}].unitPrice`,
        value: item.unitPrice,
      });
    }
  });
};

const validateAddress = (address = {}) => {
  const missing = ADDRESS_FIELDS.filter((f) => !address?.[f]).map((f) => `shippingAddress.${f}`);
  if (missing.length) throw new MissingFieldsError(missing);
};

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

  async createOrder(data = {}) {
    const { user: userId, items, shippingAddress, priority = ORDER_PRIORITY.NORMAL } = data;

    const missing = ['user', 'items', 'shippingAddress'].filter((f) => data[f] === undefined);
    if (missing.length) throw new MissingFieldsError(missing);
    validateItems(items);
    validateAddress(shippingAddress);
    validateEnum(priority, ORDER_PRIORITY, InvalidPriorityError);

    const user = await userRepository.getById(userId);
    if (!user) throw new UserNotFoundError(userId);
    if (user.role !== USER_ROLES.USER) {
      throw new ValidationError(`Solo los usuarios con rol ${USER_ROLES.USER} pueden tener pedidos`, {
        field: 'user',
        role: user.role,
      });
    }

    const orderData = {
      code: randomCode('ORD', 4),
      user: userId,
      items: items.map(({ title, quantity, unitPrice }) => ({ title, quantity, unitPrice })),
      total: items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
      status: ORDER_STATUS.PENDING,
      priority,
      shippingAddress: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, shippingAddress[f]])),
    };

    try {
      const order = await orderRepository.create(orderData);
      const delivery = await deliveryRepository.create({
        trackingCode: randomCode('SN', 5),
        order: order._id,
        status: DELIVERY_STATUS.PENDING_ASSIGNMENT,
      });

      logger.info(`Pedido ${order.code} creado para el usuario ${userId} (total $${order.total}, prioridad ${priority})`);
      logger.warning(`Pedido ${order.code} sin repartidor asignado`);
      return { order, delivery };
    } catch (err) {
      if (!(err instanceof AppError)) logger.error(`Falló la creación del pedido: ${err.name} (${err.message})`);
      throw err;
    }
  }
}

export default new OrderService();
