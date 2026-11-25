import request from 'supertest';
import app from '../../src/app.js';
import { USER_ROLES, VEHICLE_TYPES, ORDER_PRIORITY } from '../../src/constants/index.js';

let sequence = 0;
const nextId = () => `${Date.now().toString(36)}${(sequence += 1)}`;

export const NON_EXISTENT_ID = '6650f0c2a1b2c3d4e5f60718';

export const userData = (overrides = {}) => ({
  first_name: 'Cliente',
  last_name: 'Test',
  email: `cliente.${nextId()}@test.com`,
  password: 'test1234',
  role: USER_ROLES.USER,
  ...overrides,
});

export const createUser = async (overrides = {}) => {
  const res = await request(app).post('/api/users').send(userData(overrides));
  if (res.status !== 201) throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(res.body)}`);
  return res.body.payload;
};

export const createCourier = (overrides = {}) =>
  createUser({
    first_name: 'Repartidor',
    email: `repartidor.${nextId()}@test.com`,
    role: USER_ROLES.COURIER,
    vehicle: VEHICLE_TYPES.MOTORCYCLE,
    ...overrides,
  });

export const orderData = (userId, overrides = {}) => ({
  user: userId,
  items: [
    { title: 'Caja mediana', quantity: 2, unitPrice: 1500 },
    { title: 'Cinta de embalar', quantity: 1, unitPrice: 800 },
  ],
  priority: ORDER_PRIORITY.HIGH,
  shippingAddress: { street: 'San Martín 123', city: 'Rosario', province: 'Santa Fe', zipCode: '2000' },
  ...overrides,
});

export const createOrder = async (userId, overrides = {}) => {
  const res = await request(app).post('/api/orders').send(orderData(userId, overrides));
  if (res.status !== 201) throw new Error(`No se pudo crear el pedido de prueba: ${JSON.stringify(res.body)}`);
  return res.body.payload;
};
