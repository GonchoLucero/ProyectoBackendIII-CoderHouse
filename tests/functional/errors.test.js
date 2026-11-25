import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { expectError } from '../helpers/assertions.js';

describe('Errores generales', () => {
  it('ruta inexistente → 404 ROUTE_NOT_FOUND con method y path', async () => {
    const res = await request(app).get('/api/no-existe');
    expectError(res, 404, 'ROUTE_NOT_FOUND');
    expect(res.body).to.include({ method: 'GET', path: '/api/no-existe' });
    expect(res.body.error.message).to.equal('Ruta GET /api/no-existe no encontrada');
  });

  it('JSON mal formado → 400 INVALID_JSON', async () => {
    const res = await request(app).post('/api/orders').set('Content-Type', 'application/json').send('{"user": ');
    expectError(res, 400, 'INVALID_JSON');
  });

  it('id con formato inválido → 404 del recurso', async () => {
    const res = await request(app).get('/api/orders/no-es-un-id');
    expectError(res, 404, 'ORDER_NOT_FOUND');
  });
});
