import { expect } from 'chai';
import { startApp, runServer } from '../helpers/process.js';

const getJson = async (url) => {
  const res = await fetch(url, { redirect: 'manual' });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
};

describe('Configuración por entorno (producción)', function () {
  this.timeout(30000);

  describe('Criterio de endpoints internos en producción', () => {
    let app;
    before(async () => {
      app = await startApp({ NODE_ENV: 'production' });
    });
    after(() => app?.stop());

    it('el health check sigue disponible e informa el entorno', async () => {
      const { status, body } = await getJson(`${app.url}/health`);
      expect(status).to.equal(200);
      expect(body).to.include({ api: 'ok', environment: 'production' });
    });

    it('los mocks quedan deshabilitados → 403 INTERNAL_ENDPOINT_DISABLED', async () => {
      const { status, body } = await getJson(`${app.url}/api/mocks/users?qty=2`);
      expect(status).to.equal(403);
      expect(body.error.code).to.equal('INTERNAL_ENDPOINT_DISABLED');
    });

    it('el endpoint de prueba del logger queda deshabilitado → 403', async () => {
      const { status, body } = await getJson(`${app.url}/api/logger/test`);
      expect(status).to.equal(403);
      expect(body.error.code).to.equal('INTERNAL_ENDPOINT_DISABLED');
    });

    it('Swagger no se publica → 404 ROUTE_NOT_FOUND', async () => {
      const ui = await getJson(`${app.url}/api/docs/`);
      expect(ui.status).to.equal(404);
      expect(ui.body.error.code).to.equal('ROUTE_NOT_FOUND');
      const json = await getJson(`${app.url}/api/docs.json`);
      expect(json.status).to.equal(404);
    });
  });

  describe('Habilitar endpoints internos explícitamente', () => {
    let app;
    before(async () => {
      app = await startApp({ NODE_ENV: 'production', ENABLE_INTERNAL_ENDPOINTS: 'true', SWAGGER_ENABLED: 'true' });
    });
    after(() => app?.stop());

    it('con ENABLE_INTERNAL_ENDPOINTS=true los mocks responden, pero la carga en la base sigue bloqueada', async () => {
      const get = await getJson(`${app.url}/api/mocks/users?qty=2`);
      expect(get.status).to.equal(200);
      expect(get.body.payload).to.have.lengthOf(2);

      const seed = await fetch(`${app.url}/api/mocks/seed?qty=2`, { method: 'POST' });
      expect(seed.status).to.equal(403);
      expect((await seed.json()).error.code).to.equal('SEED_FORBIDDEN');
    });

    it('con SWAGGER_ENABLED=true Swagger se publica', async () => {
      const { status } = await getJson(`${app.url}/api/docs/`);
      expect(status).to.equal(200);
    });
  });

  describe('Validación de variables al iniciar', () => {
    it('si falta MONGODB_URI el servidor no arranca y lo dice claramente', async () => {
      const { code, output } = await runServer({ PORT: '8091', NODE_ENV: 'production' });
      expect(code).to.equal(1);
      expect(output).to.match(/\[fatal\].*Faltan variables de entorno obligatorias: MONGODB_URI/);
    });

    it('un LOG_LEVEL inválido también impide el arranque', async () => {
      const { code, output } = await runServer({
        PORT: '8091',
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:1/shipnow_test',
        LOG_LEVEL: 'verbose',
      });
      expect(code).to.equal(1);
      expect(output).to.include('LOG_LEVEL inválido: "verbose"');
    });

    it('un valor booleano inválido impide el arranque', async () => {
      const { code, output } = await runServer({
        PORT: '8091',
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:1/shipnow_test',
        SWAGGER_ENABLED: 'si',
      });
      expect(code).to.equal(1);
      expect(output).to.include('SWAGGER_ENABLED debe ser "true" o "false"');
    });
  });
});
