import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, USER_ROLES } from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectError, expectSuccess, expectPagination } from '../helpers/assertions.js';
import { createUser, createCourier, createOrder, orderData, NON_EXISTENT_ID } from '../helpers/factories.js';

describe('Orders — /api/orders', () => {
  let client;

  beforeEach(async () => {
    await clearDatabase();
    client = await createUser();
  });
  after(clearDatabase);

  describe('POST /api/orders', () => {
    it('crea un pedido válido con su entrega pendiente de asignación', async () => {
      const res = await request(app).post('/api/orders').send(orderData(client._id));
      expectSuccess(res, 201);

      const { order, delivery } = res.body.payload;
      expect(order).to.include({ user: client._id, status: ORDER_STATUS.PENDING, priority: ORDER_PRIORITY.HIGH, total: 3800 });
      expect(order.code).to.match(/^ORD-[0-9A-F]{8}$/);
      expect(order.items).to.have.lengthOf(2);
      expect(order.shippingAddress).to.include({ city: 'Rosario', province: 'Santa Fe' });
      expect(order).to.not.have.property('isMock');

      expect(delivery).to.include({ order: order._id, status: DELIVERY_STATUS.PENDING_ASSIGNMENT, courier: null });
      expect(delivery.trackingCode).to.match(/^SN-[0-9A-F]{10}$/);
    });

    it('usa prioridad NORMAL por defecto', async () => {
      const res = await request(app).post('/api/orders').send(orderData(client._id, { priority: undefined }));
      expectSuccess(res, 201);
      expect(res.body.payload.order.priority).to.equal(ORDER_PRIORITY.NORMAL);
    });

    it('datos incompletos → 400 MISSING_FIELDS', async () => {
      const res = await request(app).post('/api/orders').send({ user: client._id });
      expectError(res, 400, 'MISSING_FIELDS');
      expect(res.body.error.details.fields).to.deep.equal(['items', 'shippingAddress']);
    });

    it('dirección incompleta → 400 MISSING_FIELDS', async () => {
      const data = orderData(client._id, { shippingAddress: { street: 'San Martín 123', city: 'Rosario' } });
      const res = await request(app).post('/api/orders').send(data);
      expectError(res, 400, 'MISSING_FIELDS');
      expect(res.body.error.details.fields).to.deep.equal(['shippingAddress.province', 'shippingAddress.zipCode']);
    });

    it('ítem con cantidad inválida → 400 VALIDATION_ERROR', async () => {
      const data = orderData(client._id, { items: [{ title: 'Caja', quantity: 0, unitPrice: 100 }] });
      const res = await request(app).post('/api/orders').send(data);
      expectError(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.details.field).to.equal('items[0].quantity');
    });

    it('prioridad inválida → 400 INVALID_PRIORITY', async () => {
      const res = await request(app).post('/api/orders').send(orderData(client._id, { priority: 'MAXIMA' }));
      expectError(res, 400, 'INVALID_PRIORITY');
    });

    it('usuario inexistente → 404 USER_NOT_FOUND', async () => {
      const res = await request(app).post('/api/orders').send(orderData(NON_EXISTENT_ID));
      expectError(res, 404, 'USER_NOT_FOUND');
    });

    it('un repartidor no puede tener pedidos → 400 VALIDATION_ERROR', async () => {
      const courier = await createCourier();
      const res = await request(app).post('/api/orders').send(orderData(courier._id));
      expectError(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.details).to.include({ field: 'user', role: USER_ROLES.COURIER });
    });
  });

  describe('GET /api/orders', () => {
    it('lista los pedidos con el cliente populado', async () => {
      await createOrder(client._id);
      await createOrder(client._id);

      const res = await request(app).get('/api/orders');
      expectSuccess(res, 200);
      expect(res.body.orders).to.have.lengthOf(2);
      res.body.orders.forEach((order) => {
        expect(order.user).to.include({ _id: client._id, email: client.email });
        expect(order.user).to.not.have.property('password');
      });
      expectPagination(res.body.pagination, { total: 2 });
    });

    it('filtra por estado y prioridad', async () => {
      await createOrder(client._id, { priority: ORDER_PRIORITY.LOW });
      await createOrder(client._id, { priority: ORDER_PRIORITY.URGENT });

      const res = await request(app).get(`/api/orders?status=${ORDER_STATUS.PENDING}&priority=${ORDER_PRIORITY.URGENT}`);
      expectSuccess(res, 200);
      expect(res.body.orders).to.have.lengthOf(1);
      expect(res.body.orders[0].priority).to.equal(ORDER_PRIORITY.URGENT);
    });

    it('estado inválido → 400 INVALID_STATUS', async () => {
      const res = await request(app).get('/api/orders?status=PERDIDO');
      expectError(res, 400, 'INVALID_STATUS');
      expect(res.body.error.details.allowed).to.deep.equal(Object.values(ORDER_STATUS));
    });
  });

  describe('GET /api/orders/:oid', () => {
    it('devuelve el pedido por id', async () => {
      const { order } = await createOrder(client._id);
      const res = await request(app).get(`/api/orders/${order._id}`);
      expectSuccess(res, 200);
      expect(res.body.payload).to.include({ _id: order._id, code: order.code, total: order.total });
      expect(res.body.payload.user._id).to.equal(client._id);
    });

    it('pedido inexistente → 404 ORDER_NOT_FOUND', async () => {
      const res = await request(app).get(`/api/orders/${NON_EXISTENT_ID}`);
      expectError(res, 404, 'ORDER_NOT_FOUND');
    });
  });

  describe('PATCH /api/orders/:oid/status', () => {
    let order;
    let courier;

    beforeEach(async () => {
      ({ order } = await createOrder(client._id));
      courier = await createCourier();
    });

    const patch = (id, body) => request(app).patch(`/api/orders/${id}/status`).send(body);

    it('confirma el pedido y asigna repartidor', async () => {
      const res = await patch(order._id, { status: ORDER_STATUS.CONFIRMED, courier: courier._id });
      expectSuccess(res, 200);
      expect(res.body.payload.order.status).to.equal(ORDER_STATUS.CONFIRMED);
      expect(res.body.payload.delivery.status).to.equal(DELIVERY_STATUS.ASSIGNED);
      expect(res.body.payload.delivery.courier._id).to.equal(courier._id);
    });

    it('recorre el ciclo completo hasta DELIVERED', async () => {
      await patch(order._id, { status: ORDER_STATUS.CONFIRMED, courier: courier._id });
      const shipped = await patch(order._id, { status: ORDER_STATUS.SHIPPED });
      expect(shipped.body.payload.delivery.status).to.equal(DELIVERY_STATUS.IN_TRANSIT);

      const delivered = await patch(order._id, { status: ORDER_STATUS.DELIVERED });
      expectSuccess(delivered, 200);
      expect(delivered.body.payload.order.status).to.equal(ORDER_STATUS.DELIVERED);
      expect(delivered.body.payload.delivery.status).to.equal(DELIVERY_STATUS.DELIVERED);
      expect(delivered.body.payload.delivery.deliveredAt).to.be.a('string');
    });

    it('cancelar el pedido cancela la entrega', async () => {
      const res = await patch(order._id, { status: ORDER_STATUS.CANCELLED });
      expectSuccess(res, 200);
      expect(res.body.payload.delivery.status).to.equal(DELIVERY_STATUS.CANCELLED);
    });

    it('estado inválido → 400 INVALID_STATUS', async () => {
      const res = await patch(order._id, { status: 'PERDIDO' });
      expectError(res, 400, 'INVALID_STATUS');
    });

    it('sin estado → 400 MISSING_FIELDS', async () => {
      const res = await patch(order._id, {});
      expectError(res, 400, 'MISSING_FIELDS');
    });

    it('transición no permitida → 409 INVALID_STATUS_TRANSITION', async () => {
      const res = await patch(order._id, { status: ORDER_STATUS.DELIVERED });
      expectError(res, 409, 'INVALID_STATUS_TRANSITION');
      expect(res.body.error.details).to.deep.equal({
        from: ORDER_STATUS.PENDING,
        to: ORDER_STATUS.DELIVERED,
        allowed: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
      });
    });

    it('despachar sin repartidor → 400 VALIDATION_ERROR', async () => {
      await patch(order._id, { status: ORDER_STATUS.CONFIRMED });
      const res = await patch(order._id, { status: ORDER_STATUS.SHIPPED });
      expectError(res, 400, 'VALIDATION_ERROR');
      expect(res.body.error.details.field).to.equal('courier');
    });

    it('asignar un cliente como repartidor → 400 VALIDATION_ERROR', async () => {
      const res = await patch(order._id, { status: ORDER_STATUS.CONFIRMED, courier: client._id });
      expectError(res, 400, 'VALIDATION_ERROR');
    });

    it('pedido inexistente → 404 ORDER_NOT_FOUND', async () => {
      const res = await patch(NON_EXISTENT_ID, { status: ORDER_STATUS.CONFIRMED });
      expectError(res, 404, 'ORDER_NOT_FOUND');
    });
  });
});
