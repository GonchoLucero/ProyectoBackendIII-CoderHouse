import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { NODE_ENVS } from '../../src/constants/index.js';
import { expectSuccess } from '../helpers/assertions.js';

describe('Health check — /health', () => {
  it('devuelve el estado de la API, el entorno, el uptime y el timestamp', async () => {
    const res = await request(app).get('/health');
    expectSuccess(res, 200);
    expect(res.body).to.have.all.keys('status', 'api', 'environment', 'uptime', 'timestamp', 'database');
    expect(res.body.api).to.equal('ok');
    expect(res.body.environment).to.equal(NODE_ENVS.TEST);
    expect(res.body.uptime).to.be.a('number').and.at.least(0);
    expect(Date.parse(res.body.timestamp)).to.not.be.NaN;
    expect(res.body.database).to.equal('connected');
  });

  it('no expone información sensible', async () => {
    const res = await request(app).get('/health');
    const raw = JSON.stringify(res.body);
    expect(raw).to.not.match(/mongodb(\+srv)?:\/\//);
    expect(raw).to.not.match(/password|secret|token|MONGODB_URI/i);
    expect(res.headers).to.not.have.property('x-powered-by');
  });
});
