import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { DELIVERY_STATUS, ORDER_STATUS } from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectError, expectSuccess, expectPagination } from '../helpers/assertions.js';
import { createUser, createCourier, createOrder, NON_EXISTENT_ID } from '../helpers/factories.js';

describe('Deliveries — /api/deliveries', () => {
  let delivery;
  let order;

  beforeEach(async () => {
    await clearDatabase();
    const client = await createUser();
    ({ order, delivery } = await createOrder(client._id));
  });
  after(clearDatabase);

  it('GET /api/deliveries lista las entregas con su pedido populado', async () => {
    const res = await request(app).get('/api/deliveries');
    expectSuccess(res, 200);
    expect(res.body.deliveries).to.have.lengthOf(1);
    const [item] = res.body.deliveries;
    expect(item).to.include({ _id: delivery._id, status: DELIVERY_STATUS.PENDING_ASSIGNMENT, courier: null });
    expect(item.order).to.include({ _id: order._id, code: order.code, status: ORDER_STATUS.PENDING });
    expectPagination(res.body.pagination, { total: 1 });
  });

  it('GET /api/deliveries filtra por estado', async () => {
    const courier = await createCourier();
    await request(app).patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CONFIRMED, courier: courier._id });

    const assigned = await request(app).get(`/api/deliveries?status=${DELIVERY_STATUS.ASSIGNED}`);
    expectSuccess(assigned, 200);
    expect(assigned.body.deliveries).to.have.lengthOf(1);
    expect(assigned.body.deliveries[0].courier).to.include({ _id: courier._id, vehicle: courier.vehicle });

    const pending = await request(app).get(`/api/deliveries?status=${DELIVERY_STATUS.PENDING_ASSIGNMENT}`);
    expect(pending.body.deliveries).to.be.empty;
  });

  it('estado inválido → 400 INVALID_STATUS', async () => {
    const res = await request(app).get('/api/deliveries?status=PERDIDA');
    expectError(res, 400, 'INVALID_STATUS');
    expect(res.body.error.details.allowed).to.deep.equal(Object.values(DELIVERY_STATUS));
  });

  it('GET /api/deliveries/:did devuelve la entrega', async () => {
    const res = await request(app).get(`/api/deliveries/${delivery._id}`);
    expectSuccess(res, 200);
    expect(res.body.payload).to.include({ _id: delivery._id, trackingCode: delivery.trackingCode });
  });

  it('entrega inexistente → 404 DELIVERY_NOT_FOUND', async () => {
    const res = await request(app).get(`/api/deliveries/${NON_EXISTENT_ID}`);
    expectError(res, 404, 'DELIVERY_NOT_FOUND');
  });
});
