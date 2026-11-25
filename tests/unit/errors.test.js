import { mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import userRepository from '../../src/repositories/user.repository.js';
import productRepository from '../../src/repositories/product.repository.js';
import orderRepository from '../../src/repositories/order.repository.js';
import { ERRORS, AppError, UserNotFoundError } from '../../src/errors/index.js';
import { HTTP_STATUS, RESPONSE_STATUS, MOCK_COLLECTIONS, MOCK_LIMITS, ORDER_STATUS } from '../../src/constants/index.js';

afterEach(() => mock.restoreAll());

const assertErrorShape = (res, status, code) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.status, RESPONSE_STATUS.ERROR);
  assert.equal(res.body.error.code, code);
  assert.equal(typeof res.body.error.message, 'string');
  assert.equal(typeof res.body.method, 'string');
  assert.equal(typeof res.body.path, 'string');
  assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)));
};

describe('Diccionario y errores personalizados', () => {
  it('cada entrada del diccionario tiene code igual a su clave, status HTTP y mensaje', () => {
    for (const [key, def] of Object.entries(ERRORS)) {
      assert.equal(def.code, key);
      assert.ok(def.status >= 400 && def.status < 600, key);
      assert.ok(def.message.length > 0, key);
    }
  });

  it('un error de dominio toma code y status del diccionario', () => {
    const err = new UserNotFoundError('123');
    assert.ok(err instanceof AppError);
    assert.equal(err.code, ERRORS.USER_NOT_FOUND.code);
    assert.equal(err.statusCode, HTTP_STATUS.NOT_FOUND);
    assert.deepEqual(err.details, { id: '123' });
  });
});

describe('Módulo de mocks: datos inválidos', () => {
  const cases = [
    ['/api/mocks/users?qty=abc', 'MOCK_INVALID_QTY'],
    ['/api/mocks/users?qty=2.5', 'MOCK_INVALID_QTY'],
    ['/api/mocks/users?qty=0', 'MOCK_INVALID_QTY'],
    ['/api/mocks/users?qty=1&qty=2', 'MOCK_INVALID_QTY'],
    ['/api/mocks/couriers?qty=-5', 'MOCK_NEGATIVE_QTY'],
    [`/api/mocks/orders?qty=${MOCK_LIMITS.MAX_QTY + 1}`, 'MOCK_QTY_EXCEEDED'],
    ['/api/mocks/dataset?users=-1', 'MOCK_NEGATIVE_QTY'],
    ['/api/mocks/dataset?users=0&couriers=0&orders=0', 'MOCK_EMPTY_REQUEST'],
    ['/api/mocks/dataset?users=0&orders=5', 'MOCK_MISSING_DEPENDENCY'],
  ];

  for (const [url, code] of cases) {
    it(`GET ${url} → 400 ${code}`, async () => {
      const res = await request(app).get(url);
      assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, code);
    });
  }

  it('POST /api/mocks/seed?qty=-3 → 400 MOCK_NEGATIVE_QTY y no toca la base', async () => {
    const insert = mock.method(userRepository, 'insertMockMany', async () => 0);
    const res = await request(app).post('/api/mocks/seed?qty=-3');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'MOCK_NEGATIVE_QTY');
    assert.deepEqual(res.body.error.details, { param: 'qty', value: '-3' });
    assert.equal(insert.mock.callCount(), 0);
  });

  it('POST /api/mocks/seed con colección inválida → 400 MOCK_INVALID_COLLECTION', async () => {
    const res = await request(app).post('/api/mocks/seed?coleccion=mascotas');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'MOCK_INVALID_COLLECTION');
    assert.deepEqual(res.body.error.details.allowed, Object.values(MOCK_COLLECTIONS));
  });

  it('cargar pedidos sin clientes → 400 MOCK_MISSING_DEPENDENCY con la pista de qué cargar', async () => {
    mock.method(userRepository, 'getIdsByRole', async () => []);
    const res = await request(app).post(`/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.ORDERS}`);
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'MOCK_MISSING_DEPENDENCY');
    assert.match(res.body.error.details.hint, /coleccion=usuarios/);
  });
});

describe('Módulo de mocks: fallas durante la carga en MongoDB', () => {
  it('si MongoDB falla al insertar → 500 MOCK_SEED_FAILED con el motivo', async () => {
    mock.method(userRepository, 'insertMockMany', async () => {
      throw new Error('connection lost');
    });
    const res = await request(app).post('/api/mocks/seed?qty=5');
    assertErrorShape(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'MOCK_SEED_FAILED');
    assert.equal(res.body.error.details.coleccion, MOCK_COLLECTIONS.USERS);
    assert.equal(res.body.error.details.motivo, 'connection lost');
  });

  it('seed/all que falla en pedidos informa lo insertado antes del error', async () => {
    mock.method(userRepository, 'insertMockMany', async (docs) => docs.length);
    mock.method(orderRepository, 'insertMockMany', async () => {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    });
    const res = await request(app).post('/api/mocks/seed/all?users=3&couriers=2&orders=4');

    assertErrorShape(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'MOCK_SEED_FAILED');
    assert.equal(res.body.error.details.coleccion, MOCK_COLLECTIONS.ORDERS);
    assert.deepEqual(res.body.error.details.insertadosAntesDelError, {
      [MOCK_COLLECTIONS.USERS]: 3,
      [MOCK_COLLECTIONS.COURIERS]: 2,
      [MOCK_COLLECTIONS.ORDERS]: 0,
      [MOCK_COLLECTIONS.DELIVERIES]: 0,
    });
  });
});

describe('Errores de dominio detectados en los services', () => {
  it('usuario inexistente → 404 USER_NOT_FOUND', async () => {
    mock.method(userRepository, 'getById', async () => null);
    const res = await request(app).get('/api/users/64b000000000000000000001');
    assertErrorShape(res, HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    assert.deepEqual(res.body.error.details, { id: '64b000000000000000000001' });
  });

  it('pedido inexistente → 404 ORDER_NOT_FOUND', async () => {
    mock.method(orderRepository, 'getById', async () => null);
    const res = await request(app).get('/api/orders/64b000000000000000000002');
    assertErrorShape(res, HTTP_STATUS.NOT_FOUND, 'ORDER_NOT_FOUND');
  });

  it('estado inválido → 400 INVALID_STATUS con los valores permitidos', async () => {
    const res = await request(app).get('/api/orders?status=PERDIDO');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'INVALID_STATUS');
    assert.deepEqual(res.body.error.details.allowed, Object.values(ORDER_STATUS));
  });

  it('rol inválido → 400 INVALID_ROLE', async () => {
    const res = await request(app).get('/api/users?role=SUPERUSER');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'INVALID_ROLE');
  });

  it('faltan campos → 400 MISSING_FIELDS con la lista de campos', async () => {
    const res = await request(app).post('/api/users').send({ first_name: 'Ana' });
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'MISSING_FIELDS');
    assert.deepEqual(res.body.error.details.fields, ['last_name', 'email', 'password']);
  });

  it('paginación negativa → 400 INVALID_PAGINATION', async () => {
    const res = await request(app).get('/api/products?limit=-1');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'INVALID_PAGINATION');
  });
});

describe('Middleware global: errores externos normalizados', () => {
  it('JSON mal formado → 400 INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Content-Type', 'application/json')
      .send('{"title": "Caja",');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'INVALID_JSON');
  });

  it('CastError de Mongoose → 400 INVALID_ID', async () => {
    mock.method(productRepository, 'getById', async () => {
      throw new mongoose.Error.CastError('ObjectId', 'abc', '_id');
    });
    const res = await request(app).get('/api/products/abc');
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'INVALID_ID');
  });

  it('ValidationError de Mongoose → 400 VALIDATION_ERROR con detalle por campo', async () => {
    mock.method(productRepository, 'getByCode', async () => null);
    mock.method(productRepository, 'create', async () => {
      const err = new mongoose.Error.ValidationError();
      err.addError('price', new mongoose.Error.ValidatorError({ path: 'price', message: 'precio inválido' }));
      throw err;
    });
    const res = await request(app).post('/api/products').send({ title: 'Caja', code: 'C1', price: 10 });
    assertErrorShape(res, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
    assert.deepEqual(res.body.error.details, [{ field: 'price', message: 'precio inválido' }]);
  });

  it('clave duplicada de MongoDB → 409 DUPLICATE_KEY', async () => {
    mock.method(userRepository, 'getByEmail', async () => null);
    mock.method(userRepository, 'create', async () => {
      throw Object.assign(new Error('E11000'), { code: 11000, keyValue: { email: 'a@a.com' } });
    });
    const res = await request(app)
      .post('/api/users')
      .send({ first_name: 'A', last_name: 'B', email: 'a@a.com', password: '1234' });
    assertErrorShape(res, HTTP_STATUS.CONFLICT, 'DUPLICATE_KEY');
    assert.deepEqual(res.body.error.details, { fields: ['email'] });
  });

  it('base de datos caída → 503 DATABASE_UNAVAILABLE', async () => {
    mock.method(productRepository, 'getAll', async () => {
      throw Object.assign(new Error('timeout'), { name: 'MongoServerSelectionError' });
    });
    const res = await request(app).get('/api/products');
    assertErrorShape(res, HTTP_STATUS.SERVICE_UNAVAILABLE, 'DATABASE_UNAVAILABLE');
  });

  it('error inesperado → 500 INTERNAL_ERROR', async () => {
    mock.method(productRepository, 'getAll', async () => {
      throw new TypeError('x is not a function');
    });
    const res = await request(app).get('/api/products');
    assertErrorShape(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
  });

  it('ruta inexistente → 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).delete('/api/no-existe');
    assertErrorShape(res, HTTP_STATUS.NOT_FOUND, 'ROUTE_NOT_FOUND');
    assert.equal(res.body.method, 'DELETE');
    assert.equal(res.body.path, '/api/no-existe');
  });
});
