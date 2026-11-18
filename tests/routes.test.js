import { test, describe, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import userRepository from '../src/repositories/user.repository.js';
import productRepository from '../src/repositories/product.repository.js';
import { HTTP_STATUS, RESPONSE_STATUS, USER_ROLES, MOCK_COLLECTIONS } from '../src/constants/index.js';

afterEach(() => mock.restoreAll());

describe('Rutas /api/mocks', () => {
  test('GET /api/mocks/users?qty=2 devuelve 2 usuarios simulados sin tocar la base', async () => {
    const insert = mock.method(userRepository, 'insertMockMany', async () => 0);
    const res = await request(app).get('/api/mocks/users?qty=2');

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, RESPONSE_STATUS.SUCCESS);
    assert.equal(res.body.payload.length, 2);
    res.body.payload.forEach((u) => assert.ok(Object.values(USER_ROLES).includes(u.role)));
    assert.equal(insert.mock.callCount(), 0);
  });

  test('GET /api/mocks/dataset devuelve las 4 colecciones relacionadas', async () => {
    const res = await request(app).get('/api/mocks/dataset?users=2&couriers=1&orders=3');
    assert.equal(res.status, HTTP_STATUS.OK);
    const { users, couriers, orders, deliveries } = res.body.payload;
    assert.equal(users.length, 2);
    assert.equal(couriers.length, 1);
    assert.equal(orders.length, 3);
    assert.equal(deliveries.length, 3);
  });

  test('qty inválido → 400 con formato de error estándar', async () => {
    const res = await request(app).get('/api/mocks/users?qty=abc');
    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, RESPONSE_STATUS.ERROR);
    assert.equal(res.body.error.code, 'MOCK_INVALID_QTY');
    assert.match(res.body.error.message, /qty/);
  });

  test('POST /api/mocks/seed?qty=10 → 201 { insertados: 10, coleccion: "usuarios" }', async () => {
    mock.method(userRepository, 'insertMockMany', async (docs) => docs.length);
    const res = await request(app).post('/api/mocks/seed?qty=10');

    assert.equal(res.status, HTTP_STATUS.CREATED);
    assert.equal(res.body.insertados, 10);
    assert.equal(res.body.coleccion, MOCK_COLLECTIONS.USERS);
  });

  test('POST /api/mocks/seed con colección inválida → 400', async () => {
    const res = await request(app).post('/api/mocks/seed?coleccion=mascotas');
    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
  });
});

describe('Rutas existentes siguen funcionando', () => {
  test('GET /api/products usa el service y el formato estándar', async () => {
    mock.method(productRepository, 'getAll', async () => ({ items: [{ title: 'Caja' }], total: 1 }));
    const res = await request(app).get('/api/products');
    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, RESPONSE_STATUS.SUCCESS);
    assert.equal(res.body.products.length, 1);
    assert.equal(res.body.pagination.total, 1);
  });

  test('ruta inexistente → 404', async () => {
    const res = await request(app).get('/api/nada');
    assert.equal(res.status, HTTP_STATUS.NOT_FOUND);
    assert.equal(res.body.status, RESPONSE_STATUS.ERROR);
  });
});
