import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { LOG_LEVELS } from '../../src/constants/index.js';
import { expectSuccess, expectError } from '../helpers/assertions.js';

describe('Logger — /api/logger', () => {
  it('GET /api/logger/test genera un log de cada nivel y describe dónde se guardan', async () => {
    const res = await request(app).get('/api/logger/test');
    expectSuccess(res, 200);
    expect(res.body).to.include.keys('message', 'nivelActivo', 'niveles', 'archivos');
    expect(res.body.niveles.map((n) => n.nivel)).to.deep.equal(['debug', 'http', 'info', 'warning', 'error', 'fatal']);
    res.body.niveles.forEach((n) => {
      expect(n).to.have.all.keys('nivel', 'mensaje', 'seMuestra', 'seGuardaEnErrorLog');
      expect(n.seGuardaEnErrorLog).to.equal(LOG_LEVELS[n.nivel] <= LOG_LEVELS.error);
    });
    expect(res.body.archivos).to.deep.equal({ errores: 'logs/error.log', rotados: 'logs/app-%DATE%.log' });
  });

  it('un método no soportado → 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).post('/api/logger/test');
    expectError(res, 404, 'ROUTE_NOT_FOUND');
  });
});
