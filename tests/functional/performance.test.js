import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { PAGINATION } from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectError, expectSuccess } from '../helpers/assertions.js';

describe('Performance y límites', () => {
  before(clearDatabase);
  after(clearDatabase);

  ['/api/users', '/api/orders', '/api/deliveries', '/api/products'].forEach((path) => {
    it(`${path} nunca devuelve más de ${PAGINATION.MAX_LIMIT} resultados por página`, async () => {
      const res = await request(app).get(`${path}?limit=100000`);
      expectSuccess(res, 200);
      expect(res.body.pagination.limit).to.equal(PAGINATION.MAX_LIMIT);
    });

    it(`${path} pagina por defecto de a ${PAGINATION.DEFAULT_LIMIT}`, async () => {
      const res = await request(app).get(path);
      expect(res.body.pagination.limit).to.equal(PAGINATION.DEFAULT_LIMIT);
    });
  });

  it('las respuestas se comprimen con gzip cuando el cliente lo acepta', async () => {
    const res = await request(app).get('/api/docs.json').set('Accept-Encoding', 'gzip');
    expect(res.status).to.equal(200);
    expect(res.headers['content-encoding']).to.equal('gzip');
  });

  it('un body JSON de más de 100 KB se rechaza', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ first_name: 'x'.repeat(120 * 1024) }));
    expectError(res, 413, 'PAYLOAD_TOO_LARGE');
  });
});
