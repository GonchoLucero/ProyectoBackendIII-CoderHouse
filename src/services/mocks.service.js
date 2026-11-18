import bcrypt from 'bcrypt';
import config from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import orderRepository from '../repositories/order.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import AppError from '../utils/AppError.js';
import {
  generateUser,
  generateCourier,
  randomUserRole,
  generateOrder,
  generateDelivery,
  allowedOrderStatuses,
} from '../mocks/index.js';
import {
  USER_ROLES,
  HTTP_STATUS,
  MOCK_COLLECTIONS,
  MOCK_LIMITS,
  MOCK_DEFAULT_PASSWORD,
} from '../constants/index.js';

const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

const parseQty = (value, { name = 'qty', allowZero = false } = {}) => {
  if (value === undefined || value === '') return MOCK_LIMITS.DEFAULT_QTY;
  const n = Number(value);
  const min = allowZero ? 0 : 1;
  if (!Number.isInteger(n) || n < min || n > MOCK_LIMITS.MAX_QTY) {
    throw new AppError(
      `"${name}" debe ser un entero entre ${min} y ${MOCK_LIMITS.MAX_QTY}. Valor recibido: "${value}"`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return n;
};

const parseCollection = (value = MOCK_COLLECTIONS.USERS) => {
  const allowed = Object.values(MOCK_COLLECTIONS);
  if (!allowed.includes(value)) {
    throw new AppError(
      `Colección inválida: "${value}". Opciones: ${allowed.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return value;
};

const withHashedPassword = async (users) => {
  const password = await bcrypt.hash(MOCK_DEFAULT_PASSWORD, config.bcryptSaltRounds);
  return users.map((u) => ({ ...u, password }));
};

const generateMixedUsers = (qty) => times(qty, () => generateUser({ role: randomUserRole() }));

const buildOrdersWithDeliveries = ({ clientIds, courierIds, qty }) => {
  const statuses = allowedOrderStatuses(courierIds.length > 0);
  const orders = times(qty, () =>
    generateOrder({
      userId: clientIds[Math.floor(Math.random() * clientIds.length)],
      allowedStatuses: statuses,
    })
  );
  const deliveries = orders.map((order) => generateDelivery({ order, courierIds }));
  return { orders, deliveries };
};

const buildDataset = ({ users, couriers, orders }) => {
  if (orders > 0 && users === 0) {
    throw new AppError('Para generar pedidos hace falta al menos 1 usuario (users >= 1)', HTTP_STATUS.BAD_REQUEST);
  }
  const clients = times(users, () => generateUser({ role: USER_ROLES.USER }));
  const courierList = times(couriers, generateCourier);
  const { orders: orderList, deliveries } = buildOrdersWithDeliveries({
    clientIds: clients.map((u) => u._id),
    courierIds: courierList.map((c) => c._id),
    qty: orders,
  });
  return { users: clients, couriers: courierList, orders: orderList, deliveries };
};

class MocksService {
  getMockUsers(qty) {
    return generateMixedUsers(parseQty(qty));
  }

  getMockCouriers(qty) {
    return times(parseQty(qty), generateCourier);
  }

  getMockOrders(qty) {
    const n = parseQty(qty);
    const users = times(Math.ceil(n / 2), () => generateUser({ role: USER_ROLES.USER }));
    const { orders } = buildOrdersWithDeliveries({
      clientIds: users.map((u) => u._id),
      courierIds: [],
      qty: n,
    });
    return { orders, related: { users } };
  }

  getMockDeliveries(qty) {
    const n = parseQty(qty);
    const dataset = buildDataset({ users: Math.ceil(n / 2), couriers: Math.ceil(n / 3), orders: n });
    return {
      deliveries: dataset.deliveries,
      related: { orders: dataset.orders, couriers: dataset.couriers, users: dataset.users },
    };
  }

  getMockDataset({ users, couriers, orders } = {}) {
    return buildDataset({
      users: parseQty(users, { name: 'users', allowZero: true }),
      couriers: parseQty(couriers, { name: 'couriers', allowZero: true }),
      orders: parseQty(orders, { name: 'orders', allowZero: true }),
    });
  }

  async seed({ qty, coleccion } = {}) {
    const n = parseQty(qty);
    const collection = parseCollection(coleccion);

    const seeders = {
      [MOCK_COLLECTIONS.USERS]: () => this.#seedUsers(generateMixedUsers(n)),
      [MOCK_COLLECTIONS.COURIERS]: () => this.#seedUsers(times(n, generateCourier)),
      [MOCK_COLLECTIONS.ORDERS]: () => this.#seedOrders(n),
      [MOCK_COLLECTIONS.DELIVERIES]: () => this.#seedDeliveries(n),
    };

    const insertados = await seeders[collection]();
    return { insertados, coleccion: collection };
  }

  async seedAll({ users, couriers, orders } = {}) {
    const dataset = this.getMockDataset({ users, couriers, orders });

    // Orden obligatorio por las relaciones: usuarios → pedidos → entregas.
    const allUsers = await withHashedPassword([...dataset.users, ...dataset.couriers]);
    await userRepository.insertMockMany(allUsers);
    const pedidos = dataset.orders.length ? await orderRepository.insertMockMany(dataset.orders) : 0;
    const entregas = dataset.deliveries.length
      ? await deliveryRepository.insertMockMany(dataset.deliveries)
      : 0;

    return {
      insertados: {
        [MOCK_COLLECTIONS.USERS]: dataset.users.length,
        [MOCK_COLLECTIONS.COURIERS]: dataset.couriers.length,
        [MOCK_COLLECTIONS.ORDERS]: pedidos,
        [MOCK_COLLECTIONS.DELIVERIES]: entregas,
      },
    };
  }

  async clearMocks() {
    const [entregas, pedidos, usuarios] = await Promise.all([
      deliveryRepository.deleteMocks(),
      orderRepository.deleteMocks(),
      userRepository.deleteMocks(),
    ]);
    return {
      eliminados: {
        [MOCK_COLLECTIONS.USERS]: usuarios,
        [MOCK_COLLECTIONS.ORDERS]: pedidos,
        [MOCK_COLLECTIONS.DELIVERIES]: entregas,
      },
    };
  }

  async #seedUsers(users) {
    return userRepository.insertMockMany(await withHashedPassword(users));
  }

  async #seedOrders(qty) {
    const clientIds = await userRepository.getIdsByRole(USER_ROLES.USER);
    if (clientIds.length === 0) {
      throw new AppError(
        `No hay usuarios con rol ${USER_ROLES.USER} en la base. Cargá primero: POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.USERS}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const orders = times(qty, () =>
      generateOrder({ userId: clientIds[Math.floor(Math.random() * clientIds.length)] })
    );
    return orderRepository.insertMockMany(orders);
  }

  async #seedDeliveries(qty) {
    const [courierIds, orderIdsWithDelivery] = await Promise.all([
      userRepository.getIdsByRole(USER_ROLES.COURIER),
      deliveryRepository.getOrderIds(),
    ]);
    if (courierIds.length === 0) {
      throw new AppError(
        `No hay repartidores (rol ${USER_ROLES.COURIER}) en la base. Cargá primero: POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.COURIERS}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const orders = await orderRepository.getWithoutDelivery(orderIdsWithDelivery, qty);
    if (orders.length === 0) {
      throw new AppError(
        `No hay pedidos sin entrega. Cargá primero: POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.ORDERS}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const deliveries = orders.map((order) => generateDelivery({ order, courierIds }));
    return deliveryRepository.insertMockMany(deliveries);
  }
}

export default new MocksService();
