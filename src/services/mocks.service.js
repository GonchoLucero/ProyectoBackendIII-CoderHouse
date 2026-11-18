import bcrypt from 'bcrypt';
import config from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import orderRepository from '../repositories/order.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import logger from '../config/logger.js';
import {
  AppError,
  InvalidMockQuantityError,
  NegativeMockQuantityError,
  MockQuantityExceededError,
  EmptyMockRequestError,
  InvalidMockCollectionError,
  MockDependencyError,
  MockGenerationError,
  MockSeedError,
} from '../errors/index.js';
import {
  generateUser,
  generateCourier,
  randomUserRole,
  generateOrder,
  generateDelivery,
  allowedOrderStatuses,
} from '../mocks/index.js';
import { USER_ROLES, MOCK_COLLECTIONS, MOCK_LIMITS, MOCK_DEFAULT_PASSWORD } from '../constants/index.js';

const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const parseQty = (value, { name = 'qty', allowZero = false } = {}) => {
  if (value === undefined || value === '') return MOCK_LIMITS.DEFAULT_QTY;
  if (Array.isArray(value)) throw new InvalidMockQuantityError(name, value, 'se envió más de una vez');

  const n = Number(value);
  if (!Number.isInteger(n)) throw new InvalidMockQuantityError(name, value);
  if (n < 0) throw new NegativeMockQuantityError(name, value);
  if (n === 0 && !allowZero) throw new InvalidMockQuantityError(name, value, 'debe ser mayor a 0');
  if (n > MOCK_LIMITS.MAX_QTY) throw new MockQuantityExceededError(name, value, MOCK_LIMITS.MAX_QTY);
  return n;
};

const parseCollection = (value = MOCK_COLLECTIONS.USERS) => {
  if (!Object.values(MOCK_COLLECTIONS).includes(value)) {
    throw new InvalidMockCollectionError(value, MOCK_COLLECTIONS);
  }
  return value;
};

const parseDatasetParams = ({ users, couriers, orders } = {}) => {
  const params = {
    users: parseQty(users, { name: 'users', allowZero: true }),
    couriers: parseQty(couriers, { name: 'couriers', allowZero: true }),
    orders: parseQty(orders, { name: 'orders', allowZero: true }),
  };
  if (params.users + params.couriers + params.orders === 0) {
    throw new EmptyMockRequestError(Object.keys(params));
  }
  if (params.orders > 0 && params.users === 0) {
    throw new MockDependencyError('Para generar pedidos hace falta al menos 1 usuario', {
      required: 'users >= 1',
    });
  }
  return params;
};

const safeGenerate = (fn) => {
  try {
    return fn();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new MockGenerationError(`No se pudieron generar los datos de prueba: ${err.message}`, err);
  }
};

const withHashedPassword = async (users) => {
  const password = await bcrypt.hash(MOCK_DEFAULT_PASSWORD, config.bcryptSaltRounds);
  return users.map((u) => ({ ...u, password }));
};

const generateMixedUsers = (qty) => times(qty, () => generateUser({ role: randomUserRole() }));

const buildOrdersWithDeliveries = ({ clientIds, courierIds, qty }) => {
  const statuses = allowedOrderStatuses(courierIds.length > 0);
  const orders = times(qty, () => generateOrder({ userId: randomItem(clientIds), allowedStatuses: statuses }));
  const deliveries = orders.map((order) => generateDelivery({ order, courierIds }));
  return { orders, deliveries };
};

const buildDataset = ({ users, couriers, orders }) => {
  const clients = times(users, () => generateUser({ role: USER_ROLES.USER }));
  const courierList = times(couriers, generateCourier);
  const { orders: orderList, deliveries } = buildOrdersWithDeliveries({
    clientIds: clients.map((u) => u._id),
    courierIds: courierList.map((c) => c._id),
    qty: orders,
  });
  return { users: clients, couriers: courierList, orders: orderList, deliveries };
};

const runSeed = async (collection, progress, task) => {
  try {
    return await task();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new MockSeedError({
      collection,
      insertedBeforeError: progress,
      reason: err.message,
      cause: err,
    });
  }
};

const summarize = (counts) =>
  Object.entries(counts)
    .map(([name, n]) => `${n} ${name}`)
    .join(', ');

const logGenerated = (result, counts) => {
  logger.info(`Mocks generados (sin guardar): ${summarize(counts)}`);
  return result;
};

class MocksService {
  getMockUsers(qty) {
    const n = parseQty(qty);
    return logGenerated(safeGenerate(() => generateMixedUsers(n)), { [MOCK_COLLECTIONS.USERS]: n });
  }

  getMockCouriers(qty) {
    const n = parseQty(qty);
    return logGenerated(safeGenerate(() => times(n, generateCourier)), { [MOCK_COLLECTIONS.COURIERS]: n });
  }

  getMockOrders(qty) {
    const n = parseQty(qty);
    const result = safeGenerate(() => {
      const users = times(Math.ceil(n / 2), () => generateUser({ role: USER_ROLES.USER }));
      const { orders } = buildOrdersWithDeliveries({ clientIds: users.map((u) => u._id), courierIds: [], qty: n });
      return { orders, related: { users } };
    });
    return logGenerated(result, { [MOCK_COLLECTIONS.ORDERS]: n });
  }

  getMockDeliveries(qty) {
    const n = parseQty(qty);
    const result = safeGenerate(() => {
      const dataset = buildDataset({ users: Math.ceil(n / 2), couriers: Math.ceil(n / 3), orders: n });
      return {
        deliveries: dataset.deliveries,
        related: { orders: dataset.orders, couriers: dataset.couriers, users: dataset.users },
      };
    });
    return logGenerated(result, { [MOCK_COLLECTIONS.DELIVERIES]: n });
  }

  getMockDataset(query = {}) {
    const params = parseDatasetParams(query);
    const dataset = safeGenerate(() => buildDataset(params));
    return logGenerated(dataset, {
      [MOCK_COLLECTIONS.USERS]: dataset.users.length,
      [MOCK_COLLECTIONS.COURIERS]: dataset.couriers.length,
      [MOCK_COLLECTIONS.ORDERS]: dataset.orders.length,
      [MOCK_COLLECTIONS.DELIVERIES]: dataset.deliveries.length,
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

    const insertados = await runSeed(collection, 0, seeders[collection]);
    logger.info(`Datos de prueba insertados en MongoDB: ${insertados} ${collection}`);
    return { insertados, coleccion: collection };
  }

  async seedAll(query = {}) {
    const params = parseDatasetParams(query);
    const dataset = safeGenerate(() => buildDataset(params));
    const progress = {
      [MOCK_COLLECTIONS.USERS]: 0,
      [MOCK_COLLECTIONS.COURIERS]: 0,
      [MOCK_COLLECTIONS.ORDERS]: 0,
      [MOCK_COLLECTIONS.DELIVERIES]: 0,
    };

    await runSeed(MOCK_COLLECTIONS.USERS, { ...progress }, async () => {
      await userRepository.insertMockMany(await withHashedPassword([...dataset.users, ...dataset.couriers]));
      progress[MOCK_COLLECTIONS.USERS] = dataset.users.length;
      progress[MOCK_COLLECTIONS.COURIERS] = dataset.couriers.length;
    });

    if (dataset.orders.length) {
      await runSeed(MOCK_COLLECTIONS.ORDERS, { ...progress }, async () => {
        progress[MOCK_COLLECTIONS.ORDERS] = await orderRepository.insertMockMany(dataset.orders);
      });
      await runSeed(MOCK_COLLECTIONS.DELIVERIES, { ...progress }, async () => {
        progress[MOCK_COLLECTIONS.DELIVERIES] = await deliveryRepository.insertMockMany(dataset.deliveries);
      });
    }

    logger.info(`Dataset de prueba insertado en MongoDB: ${summarize(progress)}`);
    return { insertados: progress };
  }

  async clearMocks() {
    return runSeed('todas', 0, async () => {
      const [entregas, pedidos, usuarios] = await Promise.all([
        deliveryRepository.deleteMocks(),
        orderRepository.deleteMocks(),
        userRepository.deleteMocks(),
      ]);
      logger.info(`Datos de prueba eliminados: ${usuarios} usuarios, ${pedidos} pedidos, ${entregas} entregas`);
      return {
        eliminados: {
          [MOCK_COLLECTIONS.USERS]: usuarios,
          [MOCK_COLLECTIONS.ORDERS]: pedidos,
          [MOCK_COLLECTIONS.DELIVERIES]: entregas,
        },
      };
    });
  }

  async #seedUsers(users) {
    return userRepository.insertMockMany(await withHashedPassword(users));
  }

  async #seedOrders(qty) {
    const clientIds = await userRepository.getIdsByRole(USER_ROLES.USER);
    if (clientIds.length === 0) {
      throw new MockDependencyError(`No hay usuarios con rol ${USER_ROLES.USER} en la base`, {
        required: MOCK_COLLECTIONS.USERS,
        hint: `POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.USERS}`,
      });
    }
    const orders = times(qty, () => generateOrder({ userId: randomItem(clientIds) }));
    return orderRepository.insertMockMany(orders);
  }

  async #seedDeliveries(qty) {
    const [courierIds, orderIdsWithDelivery] = await Promise.all([
      userRepository.getIdsByRole(USER_ROLES.COURIER),
      deliveryRepository.getOrderIds(),
    ]);
    if (courierIds.length === 0) {
      throw new MockDependencyError(`No hay repartidores (rol ${USER_ROLES.COURIER}) en la base`, {
        required: MOCK_COLLECTIONS.COURIERS,
        hint: `POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.COURIERS}`,
      });
    }
    const orders = await orderRepository.getWithoutDelivery(orderIdsWithDelivery, qty);
    if (orders.length === 0) {
      throw new MockDependencyError('No hay pedidos sin entrega', {
        required: MOCK_COLLECTIONS.ORDERS,
        hint: `POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.ORDERS}`,
      });
    }
    const deliveries = orders.map((order) => generateDelivery({ order, courierIds }));
    const withoutCourier = deliveries.filter((d) => !d.courier).length;
    if (withoutCourier) logger.warning(`${withoutCourier} entregas quedaron sin repartidor asignado`);
    return deliveryRepository.insertMockMany(deliveries);
  }
}

export default new MocksService();
