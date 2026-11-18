import { test, describe, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mocksService from '../src/services/mocks.service.js';
import userRepository from '../src/repositories/user.repository.js';
import orderRepository from '../src/repositories/order.repository.js';
import deliveryRepository from '../src/repositories/delivery.repository.js';
import {
  USER_ROLES,
  HTTP_STATUS,
  MOCK_COLLECTIONS,
  MOCK_LIMITS,
  MOCK_DEFAULT_PASSWORD,
  DELIVERY_STATUSES_WITH_COURIER,
  ORDER_STATUS,
} from '../src/constants/index.js';

const captureInsert = (repo) => {
  const calls = [];
  mock.method(repo, 'insertMockMany', async (docs) => {
    calls.push(docs);
    return docs.length;
  });
  return calls;
};

afterEach(() => mock.restoreAll());

describe('MocksService — generación sin guardar', () => {
  test('getMockUsers devuelve la cantidad pedida con roles válidos', () => {
    const users = mocksService.getMockUsers('25');
    assert.equal(users.length, 25);
    users.forEach((u) => assert.ok(Object.values(USER_ROLES).includes(u.role)));
  });

  test('sin qty usa la cantidad por defecto', () => {
    assert.equal(mocksService.getMockCouriers().length, MOCK_LIMITS.DEFAULT_QTY);
  });

  for (const bad of ['0', '-3', 'abc', '2.5', String(MOCK_LIMITS.MAX_QTY + 1)]) {
    test(`qty="${bad}" se rechaza con 400`, () => {
      assert.throws(() => mocksService.getMockUsers(bad), (err) => err.statusCode === HTTP_STATUS.BAD_REQUEST);
    });
  }

  test('getMockOrders: cada pedido pertenece a un cliente devuelto en related.users', () => {
    const { orders, related } = mocksService.getMockOrders(10);
    const userIds = new Set(related.users.map((u) => u._id));
    assert.equal(orders.length, 10);
    related.users.forEach((u) => assert.equal(u.role, USER_ROLES.USER));
    orders.forEach((o) => assert.ok(userIds.has(o.user)));
  });

  test('getMockDataset mantiene todas las relaciones', () => {
    const { users, couriers, orders, deliveries } = mocksService.getMockDataset({
      users: '5',
      couriers: '2',
      orders: '30',
    });
    const userIds = new Set(users.map((u) => u._id));
    const courierIds = new Set(couriers.map((c) => c._id));
    const orderIds = new Set(orders.map((o) => o._id));

    assert.equal(deliveries.length, orders.length, 'una entrega por pedido');
    assert.equal(new Set(deliveries.map((d) => d.order)).size, orders.length, 'sin entregas duplicadas');
    couriers.forEach((c) => assert.equal(c.role, USER_ROLES.COURIER));
    orders.forEach((o) => assert.ok(userIds.has(o.user)));
    deliveries.forEach((d) => {
      assert.ok(orderIds.has(d.order));
      if (d.courier) assert.ok(courierIds.has(d.courier));
    });
  });

  test('sin repartidores, ninguna entrega queda en un estado que los requiera', () => {
    const { deliveries } = mocksService.getMockDataset({ users: '3', couriers: '0', orders: '50' });
    deliveries.forEach((d) => {
      assert.equal(d.courier, null);
      assert.ok(!DELIVERY_STATUSES_WITH_COURIER.includes(d.status));
    });
  });

  test('pedir pedidos sin usuarios es un error 400', () => {
    assert.throws(
      () => mocksService.getMockDataset({ users: '0', orders: '5' }),
      (err) => err.statusCode === HTTP_STATUS.BAD_REQUEST
    );
  });
});

describe('MocksService — carga en MongoDB (repositories simulados)', () => {
  test('seed de usuarios responde { insertados, coleccion } y guarda el password hasheado', async () => {
    const calls = captureInsert(userRepository);
    const result = await mocksService.seed({ qty: '10' });

    assert.deepEqual(result, { insertados: 10, coleccion: MOCK_COLLECTIONS.USERS });
    const [docs] = calls;
    assert.equal(docs.length, 10);
    assert.notEqual(docs[0].password, MOCK_DEFAULT_PASSWORD);
    assert.ok(await bcrypt.compare(MOCK_DEFAULT_PASSWORD, docs[0].password));
  });

  test('seed de repartidores solo crea usuarios COURIER', async () => {
    const calls = captureInsert(userRepository);
    await mocksService.seed({ qty: '4', coleccion: MOCK_COLLECTIONS.COURIERS });
    calls[0].forEach((u) => assert.equal(u.role, USER_ROLES.COURIER));
  });

  test('seed de pedidos usa usuarios USER existentes en la base', async () => {
    const existingIds = ['64b000000000000000000001', '64b000000000000000000002'];
    mock.method(userRepository, 'getIdsByRole', async (role) => {
      assert.equal(role, USER_ROLES.USER);
      return existingIds;
    });
    const calls = captureInsert(orderRepository);

    const result = await mocksService.seed({ qty: '6', coleccion: MOCK_COLLECTIONS.ORDERS });
    assert.equal(result.insertados, 6);
    calls[0].forEach((o) => assert.ok(existingIds.includes(o.user)));
  });

  test('seed de pedidos sin clientes en la base → 400 con mensaje claro', async () => {
    mock.method(userRepository, 'getIdsByRole', async () => []);
    await assert.rejects(
      mocksService.seed({ qty: '3', coleccion: MOCK_COLLECTIONS.ORDERS }),
      (err) =>
        err.statusCode === HTTP_STATUS.BAD_REQUEST &&
        err.code === 'MOCK_MISSING_DEPENDENCY' &&
        err.details.required === MOCK_COLLECTIONS.USERS
    );
  });

  test('seed de entregas solo crea entregas para pedidos sin entrega', async () => {
    const courierIds = ['64c000000000000000000001'];
    const pending = [
      { _id: '64d000000000000000000001', status: ORDER_STATUS.SHIPPED },
      { _id: '64d000000000000000000002', status: ORDER_STATUS.PENDING },
    ];
    mock.method(userRepository, 'getIdsByRole', async () => courierIds);
    mock.method(deliveryRepository, 'getOrderIds', async () => ['64d000000000000000000099']);
    mock.method(orderRepository, 'getWithoutDelivery', async (excluded, limit) => {
      assert.deepEqual(excluded, ['64d000000000000000000099']);
      assert.equal(limit, 10);
      return pending;
    });
    const calls = captureInsert(deliveryRepository);

    const result = await mocksService.seed({ qty: '10', coleccion: MOCK_COLLECTIONS.DELIVERIES });
    assert.equal(result.insertados, 2);
    assert.deepEqual(calls[0].map((d) => d.order), pending.map((o) => o._id));
    assert.equal(calls[0][0].courier, courierIds[0]);
    assert.equal(calls[0][1].courier, null);
  });

  test('colección desconocida → 400', async () => {
    await assert.rejects(mocksService.seed({ coleccion: 'mascotas' }), (err) => err.statusCode === HTTP_STATUS.BAD_REQUEST);
  });

  test('seedAll inserta usuarios → pedidos → entregas', async () => {
    const order = [];
    mock.method(userRepository, 'insertMockMany', async (d) => (order.push('users'), d.length));
    mock.method(orderRepository, 'insertMockMany', async (d) => (order.push('orders'), d.length));
    mock.method(deliveryRepository, 'insertMockMany', async (d) => (order.push('deliveries'), d.length));

    const result = await mocksService.seedAll({ users: '3', couriers: '2', orders: '5' });
    assert.deepEqual(order, ['users', 'orders', 'deliveries']);
    assert.deepEqual(result.insertados, {
      [MOCK_COLLECTIONS.USERS]: 3,
      [MOCK_COLLECTIONS.COURIERS]: 2,
      [MOCK_COLLECTIONS.ORDERS]: 5,
      [MOCK_COLLECTIONS.DELIVERIES]: 5,
    });
  });
});
