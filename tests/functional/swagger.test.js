import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { ERRORS } from '../../src/errors/index.js';

describe('Swagger — /api/docs', () => {
  it('GET /api/docs redirige a la UI', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).to.equal(301);
    expect(res.headers.location).to.equal('/api/docs/');
  });

  it('GET /api/docs/ sirve Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/text\/html/);
    expect(res.text).to.include('swagger-ui');
  });

  it('GET /api/docs.json devuelve la especificación OpenAPI', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).to.equal(200);
    expect(res.body.openapi).to.match(/^3\./);
    expect(res.body.info).to.include({ title: 'ShipNow API' });
    expect(res.body.tags.map((t) => t.name)).to.include.members(['Users', 'Orders', 'Deliveries', 'Mocks', 'Logger']);
    expect(res.body.components.schemas).to.include.keys('User', 'Order', 'Delivery', 'OrderItem', 'ErrorResponse', 'SuccessResponse');
  });

  it('cada 404 documentado de un recurso por id se devuelve de verdad', async () => {
    const { body: spec } = await request(app).get('/api/docs.json');
    const id = '6650f0c2a1b2c3d4e5f60718';
    const documented404 = Object.entries(spec.paths).flatMap(([path, ops]) =>
      Object.entries(ops)
        .filter(([method, op]) => method === 'get' && op.responses['404'])
        .map(([method, op]) => ({ path, method, codes: Object.keys(op.responses['404'].content['application/json'].examples) }))
    );
    expect(documented404).to.not.be.empty;

    for (const { path, codes } of documented404) {
      const res = await request(app).get(path.replace(/\{\w+\}/, id));
      expect(res.status, path).to.equal(404);
      expect(codes, path).to.include(res.body.error.code);
      expect(ERRORS[res.body.error.code].status).to.equal(404);
    }
  });
});
