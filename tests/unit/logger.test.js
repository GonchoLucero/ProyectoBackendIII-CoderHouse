import { mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import logger, { formatLine, resolveLevel } from '../../src/config/logger.js';
import userRepository from '../../src/repositories/user.repository.js';
import orderRepository from '../../src/repositories/order.repository.js';
import deliveryRepository from '../../src/repositories/delivery.repository.js';
import { HTTP_STATUS, LOG_LEVELS, NODE_ENVS, USER_ROLES } from '../../src/constants/index.js';

afterEach(() => mock.restoreAll());

const spyLevels = () =>
  Object.fromEntries(Object.keys(LOG_LEVELS).map((level) => [level, mock.method(logger, level, () => {})]));

const validOrder = () => ({
  user: '64b000000000000000000001',
  items: [{ title: 'Caja', quantity: 2, unitPrice: 1500 }],
  shippingAddress: { street: 'Calle 1 123', city: 'Rosario', province: 'Santa Fe', zipCode: '2000' },
});

describe('Configuración del logger', () => {
  it('define los niveles debug, http, info, warning, error y fatal en orden de importancia', () => {
    assert.deepEqual(Object.keys(LOG_LEVELS).sort((a, b) => LOG_LEVELS[a] - LOG_LEVELS[b]), [
      'fatal',
      'error',
      'warning',
      'info',
      'http',
      'debug',
    ]);
    Object.keys(LOG_LEVELS).forEach((level) => assert.equal(typeof logger[level], 'function'));
  });

  it('desarrollo registra desde debug y producción desde info', () => {
    assert.equal(resolveLevel(NODE_ENVS.DEVELOPMENT), 'debug');
    assert.equal(resolveLevel(NODE_ENVS.PRODUCTION), 'info');
  });

  it('el formato es timestamp + [nivel] + mensaje', () => {
    const line = formatLine({
      timestamp: '2026-08-01 10:12:03',
      level: 'info',
      message: 'Servidor ShipNow escuchando en el puerto 3000',
      [Symbol.for('level')]: 'info',
    });
    assert.equal(line, '2026-08-01 10:12:03 [info]    Servidor ShipNow escuchando en el puerto 3000');
  });

  it('el formato agrega el stack de los errores', () => {
    const line = formatLine({ timestamp: 't', level: 'error', message: 'falla', stack: 'Error: falla\n    at x' });
    assert.match(line, /\[error\]\s+falla\nError: falla/);
  });
});

describe('Endpoint de prueba del logger', () => {
  it('GET /api/logger/test genera un log de cada nivel', async () => {
    const spies = spyLevels();
    const res = await request(app).get('/api/logger/test');

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.deepEqual(
      res.body.niveles.map((n) => n.nivel),
      ['debug', 'http', 'info', 'warning', 'error', 'fatal']
    );
    for (const level of Object.keys(LOG_LEVELS)) {
      assert.ok(spies[level].mock.callCount() >= 1, `falta el log de nivel ${level}`);
    }
    const errorLog = res.body.niveles.filter((n) => n.seGuardaEnErrorLog).map((n) => n.nivel);
    assert.deepEqual(errorLog, ['error', 'fatal']);
  });
});

describe('Integración con el middleware de errores', () => {
  it('un error de negocio (4xx) se registra como warning', async () => {
    const spies = spyLevels();
    mock.method(orderRepository, 'getById', async () => null);
    await request(app).get('/api/orders/64b000000000000000000009');

    const warning = spies.warning.mock.calls.map((c) => c.arguments[0]).find((m) => m.includes('ORDER_NOT_FOUND'));
    assert.ok(warning, 'debería loguear el pedido no encontrado como warning');
    assert.equal(spies.error.mock.callCount(), 0);
  });

  it('una cantidad inválida en mocks se registra como warning', async () => {
    const spies = spyLevels();
    await request(app).get('/api/mocks/users?qty=-5');
    assert.ok(spies.warning.mock.calls.some((c) => c.arguments[0].includes('MOCK_NEGATIVE_QTY')));
  });

  it('un error inesperado (5xx) se registra como error con su stack', async () => {
    const spies = spyLevels();
    mock.method(orderRepository, 'getAll', async () => {
      throw new TypeError('x is not a function');
    });
    await request(app).get('/api/orders');

    const [message, meta] = spies.error.mock.calls[0].arguments;
    assert.match(message, /INTERNAL_ERROR/);
    assert.match(meta.stack, /TypeError: x is not a function/);
  });

  it('cada request se registra en el nivel http', async () => {
    const spies = spyLevels();
    await request(app).get('/health');
    assert.ok(spies.http.mock.calls.some((c) => /GET \/health 200/.test(c.arguments[0])));
  });
});

describe('Eventos importantes', () => {
  it('crear un pedido loguea info y warning por no tener repartidor', async () => {
    const spies = spyLevels();
    mock.method(userRepository, 'getById', async (id) => ({ _id: id, role: USER_ROLES.USER }));
    mock.method(orderRepository, 'create', async (data) => ({ _id: '64c000000000000000000001', ...data }));
    mock.method(deliveryRepository, 'create', async (data) => ({ _id: '64d000000000000000000001', ...data }));

    const res = await request(app).post('/api/orders').send(validOrder());

    assert.equal(res.status, HTTP_STATUS.CREATED);
    assert.equal(res.body.payload.order.total, 3000);
    assert.equal(res.body.payload.delivery.courier, undefined);
    assert.ok(spies.info.mock.calls.some((c) => /Pedido ORD-\w+ creado/.test(c.arguments[0])));
    assert.ok(spies.warning.mock.calls.some((c) => /sin repartidor asignado/.test(c.arguments[0])));
  });

  it('si falla la creación del pedido en la base se loguea como error', async () => {
    const spies = spyLevels();
    mock.method(userRepository, 'getById', async (id) => ({ _id: id, role: USER_ROLES.USER }));
    mock.method(orderRepository, 'create', async () => {
      throw Object.assign(new Error('campo "shippingAddress" requerido'), { name: 'ValidationError' });
    });

    await request(app).post('/api/orders').send(validOrder());
    assert.ok(spies.error.mock.calls.some((c) => /Falló la creación del pedido: ValidationError/.test(c.arguments[0])));
  });

  it('un pedido para un usuario que no es cliente se rechaza', async () => {
    spyLevels();
    mock.method(userRepository, 'getById', async (id) => ({ _id: id, role: USER_ROLES.COURIER }));
    const res = await request(app).post('/api/orders').send(validOrder());
    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('generar mocks loguea un info con la cantidad', async () => {
    const spies = spyLevels();
    await request(app).get('/api/mocks/couriers?qty=3');
    assert.ok(spies.info.mock.calls.some((c) => /Mocks generados \(sin guardar\): 3 repartidores/.test(c.arguments[0])));
  });
});
