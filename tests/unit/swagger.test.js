import { mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import app from '../../src/app.js';
import { swaggerSpec, SWAGGER_PATHS } from '../../src/docs/swagger.js';
import { ERRORS } from '../../src/errors/index.js';
import productsRouter from '../../src/routes/products.router.js';
import usersRouter from '../../src/routes/users.router.js';
import ordersRouter from '../../src/routes/orders.router.js';
import deliveriesRouter from '../../src/routes/deliveries.router.js';
import mocksRouter from '../../src/routes/mocks.router.js';
import loggerRouter from '../../src/routes/logger.router.js';
import userRepository from '../../src/repositories/user.repository.js';
import orderRepository from '../../src/repositories/order.repository.js';
import deliveryRepository from '../../src/repositories/delivery.repository.js';

afterEach(() => mock.restoreAll());

const ROUTERS = {
  '/api/products': productsRouter,
  '/api/users': usersRouter,
  '/api/orders': ordersRouter,
  '/api/deliveries': deliveriesRouter,
  '/api/mocks': mocksRouter,
  '/api/logger': loggerRouter,
};

const toOpenApiPath = (prefix, path) => `${prefix}${path === '/' ? '' : path}`.replace(/:(\w+)/g, '{$1}');

const realOperations = () =>
  Object.entries(ROUTERS).flatMap(([prefix, router]) =>
    router.stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${toOpenApiPath(prefix, layer.route.path)}`)
      )
  );

const documentedOperations = () =>
  Object.entries(swaggerSpec.paths).flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`));

const documentedCodes = (path, method, status) => {
  const examples = swaggerSpec.paths[path][method].responses[status]?.content['application/json'].examples ?? {};
  return Object.keys(examples);
};

describe('Swagger / OpenAPI', () => {
  it('la especificación es un OpenAPI válido', async () => {
    await SwaggerParser.validate(structuredClone(swaggerSpec));
  });

  it('incluye nombre, versión, descripción y servidor local', () => {
    assert.equal(swaggerSpec.info.title, 'ShipNow API');
    assert.ok(swaggerSpec.info.version);
    assert.ok(swaggerSpec.info.description.length > 0);
    assert.match(swaggerSpec.servers[0].url, /^http:\/\/localhost:\d+$/);
  });

  it(`Swagger UI se sirve en ${SWAGGER_PATHS.UI} y el JSON en ${SWAGGER_PATHS.JSON}`, async () => {
    const ui = await request(app).get(`${SWAGGER_PATHS.UI}/`);
    assert.equal(ui.status, 200);
    assert.match(ui.text, /swagger-ui/i);

    const json = await request(app).get(SWAGGER_PATHS.JSON);
    assert.equal(json.status, 200);
    assert.equal(json.body.info.title, 'ShipNow API');
  });

  it('todas las rutas reales están documentadas y no se documentan rutas inexistentes', () => {
    assert.deepEqual(documentedOperations().sort(), realOperations().sort());
  });

  it('todos los endpoints tienen tag y existen los tags pedidos', () => {
    const tagNames = swaggerSpec.tags.map((t) => t.name);
    ['Users', 'Orders', 'Deliveries', 'Mocks', 'Logger'].forEach((tag) => assert.ok(tagNames.includes(tag), tag));
    for (const ops of Object.values(swaggerSpec.paths)) {
      for (const op of Object.values(ops)) {
        assert.equal(op.tags.length, 1);
        assert.ok(tagNames.includes(op.tags[0]));
        assert.ok(op.summary);
        assert.ok(Object.keys(op.responses).some((s) => s.startsWith('2')), 'falta la respuesta exitosa');
      }
    }
  });

  it('existen los schemas reutilizables pedidos', () => {
    ['User', 'Order', 'Delivery', 'OrderItem', 'ErrorResponse', 'SuccessResponse'].forEach((name) =>
      assert.ok(swaggerSpec.components.schemas[name], name)
    );
  });

  it('cada error documentado usa el status HTTP que le asigna el diccionario', () => {
    for (const [path, ops] of Object.entries(swaggerSpec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        for (const [status, response] of Object.entries(op.responses)) {
          const examples = response.content?.['application/json']?.examples ?? {};
          for (const code of Object.keys(examples)) {
            assert.equal(ERRORS[code]?.status, Number(status), `${method.toUpperCase()} ${path} → ${code}`);
          }
        }
      }
    }
  });
});

describe('La documentación coincide con las respuestas reales', () => {
  const cases = [
    ['get', '/api/mocks/users', '/api/mocks/users?qty=-5', 400],
    ['get', '/api/mocks/orders', '/api/mocks/orders?qty=abc', 400],
    ['get', '/api/mocks/couriers', '/api/mocks/couriers?qty=1000', 400],
    ['get', '/api/mocks/dataset', '/api/mocks/dataset?users=0&couriers=0&orders=0', 400],
    ['post', '/api/mocks/seed', '/api/mocks/seed?coleccion=mascotas', 400],
    ['post', '/api/mocks/seed/all', '/api/mocks/seed/all?users=0&orders=5', 400],
    ['get', '/api/orders', '/api/orders?status=PERDIDO', 400],
    ['get', '/api/deliveries', '/api/deliveries?status=PERDIDA', 400],
    ['get', '/api/users', '/api/users?role=SUPERUSER', 400],
    ['get', '/api/products', '/api/products?limit=-1', 400],
  ];

  for (const [method, docPath, url, status] of cases) {
    it(`${method.toUpperCase()} ${url} devuelve un error documentado`, async () => {
      const res = await request(app)[method](url);
      assert.equal(res.status, status);
      assert.ok(
        documentedCodes(docPath, method, status).includes(res.body.error.code),
        `${res.body.error.code} no está documentado en ${method.toUpperCase()} ${docPath} ${status}`
      );
    });
  }

  it('recursos inexistentes devuelven el 404 documentado', async () => {
    mock.method(userRepository, 'getById', async () => null);
    mock.method(orderRepository, 'getById', async () => null);
    mock.method(deliveryRepository, 'getById', async () => null);
    for (const [docPath, url] of [
      ['/api/users/{uid}', '/api/users/6650f0c2a1b2c3d4e5f60718'],
      ['/api/orders/{oid}', '/api/orders/6650f0c2a1b2c3d4e5f60718'],
      ['/api/deliveries/{did}', '/api/deliveries/6650f0c2a1b2c3d4e5f60718'],
    ]) {
      const res = await request(app).get(url);
      assert.equal(res.status, 404);
      assert.ok(documentedCodes(docPath, 'get', 404).includes(res.body.error.code));
    }
  });

  it('crear pedido con datos faltantes devuelve el 400 documentado', async () => {
    const res = await request(app).post('/api/orders').send({ user: '6650f0c2a1b2c3d4e5f60718' });
    assert.equal(res.status, 400);
    assert.ok(documentedCodes('/api/orders', 'post', 400).includes(res.body.error.code));
  });
});
