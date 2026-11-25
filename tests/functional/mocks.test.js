import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import {
  USER_ROLES,
  VEHICLE_TYPES,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  ORDER_TO_DELIVERY_STATUS,
  MOCK_COLLECTIONS,
  MOCK_LIMITS,
} from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectError, expectSuccess } from '../helpers/assertions.js';
import { createUser } from '../helpers/factories.js';

const countUsers = async () => (await request(app).get('/api/users')).body.pagination.total;

describe('Mocks — /api/mocks', () => {
  beforeEach(clearDatabase);
  after(clearDatabase);

  describe('Generación sin guardar', () => {
    it('GET /api/mocks/users?qty=5 devuelve 5 usuarios válidos y no los guarda', async () => {
      const res = await request(app).get('/api/mocks/users?qty=5');
      expectSuccess(res, 200);
      expect(res.body.payload).to.have.lengthOf(5);
      res.body.payload.forEach((user) => {
        expect(user).to.include.keys('_id', 'first_name', 'last_name', 'email', 'role');
        expect(Object.values(USER_ROLES)).to.include(user.role);
        expect(user.email).to.match(/@test\.com$/);
      });
      expect(await countUsers()).to.equal(0);
    });

    it('GET /api/mocks/users sin qty usa la cantidad por defecto', async () => {
      const res = await request(app).get('/api/mocks/users');
      expectSuccess(res, 200);
      expect(res.body.payload).to.have.lengthOf(MOCK_LIMITS.DEFAULT_QTY);
    });

    it('GET /api/mocks/couriers devuelve repartidores con vehículo', async () => {
      const res = await request(app).get('/api/mocks/couriers?qty=3');
      expectSuccess(res, 200);
      res.body.payload.forEach((courier) => {
        expect(courier.role).to.equal(USER_ROLES.COURIER);
        expect(Object.values(VEHICLE_TYPES)).to.include(courier.vehicle);
      });
    });

    it('GET /api/mocks/orders devuelve pedidos relacionados con sus clientes', async () => {
      const res = await request(app).get('/api/mocks/orders?qty=4');
      expectSuccess(res, 200);
      const userIds = res.body.related.users.map((u) => u._id);
      expect(res.body.payload).to.have.lengthOf(4);
      res.body.payload.forEach((order) => {
        expect(userIds).to.include(order.user);
        expect(Object.values(ORDER_STATUS)).to.include(order.status);
        expect(Object.values(ORDER_PRIORITY)).to.include(order.priority);
        expect(order.total).to.equal(order.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0));
      });
    });

    it('GET /api/mocks/deliveries devuelve entregas coherentes con sus pedidos', async () => {
      const res = await request(app).get('/api/mocks/deliveries?qty=6');
      expectSuccess(res, 200);
      const orders = Object.fromEntries(res.body.related.orders.map((o) => [o._id, o]));
      res.body.payload.forEach((delivery) => {
        const order = orders[delivery.order];
        expect(order).to.exist;
        expect(ORDER_TO_DELIVERY_STATUS[order.status]).to.include(delivery.status);
      });
    });

    it('GET /api/mocks/dataset devuelve las 4 colecciones relacionadas', async () => {
      const res = await request(app).get('/api/mocks/dataset?users=3&couriers=2&orders=5');
      expectSuccess(res, 200);
      const { users, couriers, orders, deliveries } = res.body.payload;
      expect([users.length, couriers.length, orders.length, deliveries.length]).to.deep.equal([3, 2, 5, 5]);
    });
  });

  describe('Cantidades inválidas', () => {
    const cases = [
      ['/api/mocks/users?qty=abc', 'MOCK_INVALID_QTY'],
      ['/api/mocks/users?qty=0', 'MOCK_INVALID_QTY'],
      ['/api/mocks/users?qty=2.5', 'MOCK_INVALID_QTY'],
      ['/api/mocks/couriers?qty=-5', 'MOCK_NEGATIVE_QTY'],
      [`/api/mocks/orders?qty=${MOCK_LIMITS.MAX_QTY + 1}`, 'MOCK_QTY_EXCEEDED'],
      ['/api/mocks/deliveries?qty=-1', 'MOCK_NEGATIVE_QTY'],
      ['/api/mocks/dataset?users=0&couriers=0&orders=0', 'MOCK_EMPTY_REQUEST'],
      ['/api/mocks/dataset?users=0&orders=5', 'MOCK_MISSING_DEPENDENCY'],
    ];

    cases.forEach(([url, code]) => {
      it(`GET ${url} → 400 ${code}`, async () => {
        const res = await request(app).get(url);
        expectError(res, 400, code);
        expect(res.body.path).to.equal(url);
      });
    });

    it('POST /api/mocks/seed?qty=-3 → 400 MOCK_NEGATIVE_QTY y no inserta nada', async () => {
      const res = await request(app).post('/api/mocks/seed?qty=-3');
      expectError(res, 400, 'MOCK_NEGATIVE_QTY');
      expect(res.body.error.details).to.deep.equal({ param: 'qty', value: '-3' });
      expect(await countUsers()).to.equal(0);
    });

    it('POST /api/mocks/seed con colección inválida → 400 MOCK_INVALID_COLLECTION', async () => {
      const res = await request(app).post('/api/mocks/seed?coleccion=mascotas');
      expectError(res, 400, 'MOCK_INVALID_COLLECTION');
    });
  });

  describe('Carga en MongoDB', () => {
    it('POST /api/mocks/seed?qty=10 inserta 10 usuarios', async () => {
      const res = await request(app).post('/api/mocks/seed?qty=10');
      expectSuccess(res, 201);
      expect(res.body).to.deep.equal({ status: 'success', insertados: 10, coleccion: MOCK_COLLECTIONS.USERS });
      expect(await countUsers()).to.equal(10);
    });

    it('carga paso a paso: usuarios → repartidores → pedidos → entregas', async () => {
      await request(app).post(`/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.USERS}&qty=5`);
      await request(app).post(`/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.COURIERS}&qty=2`);
      const orders = await request(app).post(`/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.ORDERS}&qty=6`);
      expect(orders.body.insertados).to.equal(6);

      const deliveries = await request(app).post(`/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.DELIVERIES}&qty=10`);
      expectSuccess(deliveries, 201);
      expect(deliveries.body.insertados).to.equal(6);

      const list = await request(app).get('/api/deliveries?limit=100');
      list.body.deliveries.forEach((d) => {
        if ([DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.IN_TRANSIT, DELIVERY_STATUS.DELIVERED].includes(d.status)) {
          expect(d.courier.role).to.equal(USER_ROLES.COURIER);
        } else {
          expect(d.courier).to.equal(null);
        }
      });
    });

    it('cargar pedidos sin clientes → 400 MOCK_MISSING_DEPENDENCY con la pista', async () => {
      const res = await request(app).post(`/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.ORDERS}`);
      expectError(res, 400, 'MOCK_MISSING_DEPENDENCY');
      expect(res.body.error.details).to.deep.equal({
        required: MOCK_COLLECTIONS.USERS,
        hint: `POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.USERS}`,
      });
    });

    it('POST /api/mocks/seed/all inserta un dataset relacionado', async () => {
      const res = await request(app).post('/api/mocks/seed/all?users=4&couriers=2&orders=8');
      expectSuccess(res, 201);
      expect(res.body.insertados).to.deep.equal({
        [MOCK_COLLECTIONS.USERS]: 4,
        [MOCK_COLLECTIONS.COURIERS]: 2,
        [MOCK_COLLECTIONS.ORDERS]: 8,
        [MOCK_COLLECTIONS.DELIVERIES]: 8,
      });

      const orders = await request(app).get('/api/orders?limit=100');
      expect(orders.body.pagination.total).to.equal(8);
      orders.body.orders.forEach((o) => expect(o.user.role).to.equal(USER_ROLES.USER));
    });

    it('DELETE /api/mocks/seed borra solo los datos de prueba', async () => {
      const realUser = await createUser();
      await request(app).post('/api/mocks/seed/all?users=3&couriers=1&orders=2');

      const res = await request(app).delete('/api/mocks/seed');
      expectSuccess(res, 200);
      expect(res.body.eliminados).to.deep.equal({
        [MOCK_COLLECTIONS.USERS]: 4,
        [MOCK_COLLECTIONS.ORDERS]: 2,
        [MOCK_COLLECTIONS.DELIVERIES]: 2,
      });

      const users = await request(app).get('/api/users');
      expect(users.body.users.map((u) => u._id)).to.deep.equal([realUser._id]);
    });
  });
});
