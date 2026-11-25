import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { USER_ROLES, VEHICLE_TYPES } from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectError, expectSuccess, expectPagination } from '../helpers/assertions.js';
import { createUser, createCourier, userData, NON_EXISTENT_ID } from '../helpers/factories.js';

describe('Users — /api/users', () => {
  beforeEach(clearDatabase);
  after(clearDatabase);

  describe('GET /api/users', () => {
    it('devuelve una lista vacía con paginación cuando no hay usuarios', async () => {
      const res = await request(app).get('/api/users');
      expectSuccess(res, 200);
      expect(res.body.users).to.be.an('array').that.is.empty;
      expectPagination(res.body.pagination, { total: 0 });
    });

    it('lista los usuarios creados sin exponer el password', async () => {
      await createUser();
      await createCourier();

      const res = await request(app).get('/api/users');
      expectSuccess(res, 200);
      expect(res.body.users).to.have.lengthOf(2);
      res.body.users.forEach((user) => {
        expect(user).to.include.keys('_id', 'first_name', 'last_name', 'email', 'role');
        expect(user).to.not.have.property('password');
        expect(Object.values(USER_ROLES)).to.include(user.role);
      });
      expectPagination(res.body.pagination, { total: 2 });
    });

    it('filtra por rol', async () => {
      await createUser();
      const courier = await createCourier();

      const res = await request(app).get(`/api/users?role=${USER_ROLES.COURIER}`);
      expectSuccess(res, 200);
      expect(res.body.users).to.have.lengthOf(1);
      expect(res.body.users[0]._id).to.equal(courier._id);
      expect(res.body.users[0].vehicle).to.equal(VEHICLE_TYPES.MOTORCYCLE);
    });

    it('pagina con limit y page', async () => {
      for (let i = 0; i < 3; i += 1) await createUser();
      const res = await request(app).get('/api/users?limit=2&page=2');
      expectSuccess(res, 200);
      expect(res.body.users).to.have.lengthOf(1);
      expectPagination(res.body.pagination, { total: 3, page: 2, limit: 2 });
    });

    it('rol inválido → 400 INVALID_ROLE con los valores permitidos', async () => {
      const res = await request(app).get('/api/users?role=SUPERUSER');
      expectError(res, 400, 'INVALID_ROLE');
      expect(res.body.error.details.allowed).to.deep.equal(Object.values(USER_ROLES));
    });

    it('paginación inválida → 400 INVALID_PAGINATION', async () => {
      const res = await request(app).get('/api/users?limit=-1');
      expectError(res, 400, 'INVALID_PAGINATION');
    });
  });

  describe('GET /api/users/:uid', () => {
    it('devuelve el usuario por id', async () => {
      const user = await createUser({ first_name: 'Ana' });
      const res = await request(app).get(`/api/users/${user._id}`);
      expectSuccess(res, 200);
      expect(res.body.payload).to.include({ _id: user._id, first_name: 'Ana', role: USER_ROLES.USER });
      expect(res.body.payload).to.not.have.property('password');
    });

    it('usuario inexistente → 404 USER_NOT_FOUND', async () => {
      const res = await request(app).get(`/api/users/${NON_EXISTENT_ID}`);
      expectError(res, 404, 'USER_NOT_FOUND');
      expect(res.body.error.details).to.deep.equal({ id: NON_EXISTENT_ID });
    });
  });

  describe('POST /api/users', () => {
    it('crea un usuario con datos válidos', async () => {
      const data = userData();
      const res = await request(app).post('/api/users').send(data);
      expectSuccess(res, 201);
      expect(res.body.payload).to.include({ email: data.email, role: USER_ROLES.USER });
      expect(res.body.payload).to.have.property('_id');
      expect(res.body.payload).to.not.have.property('password');
    });

    it('datos incompletos → 400 MISSING_FIELDS con los campos faltantes', async () => {
      const res = await request(app).post('/api/users').send({ first_name: 'Ana' });
      expectError(res, 400, 'MISSING_FIELDS');
      expect(res.body.error.details.fields).to.deep.equal(['last_name', 'email', 'password']);
    });

    it('email repetido → 409 DUPLICATE_EMAIL', async () => {
      const user = await createUser();
      const res = await request(app).post('/api/users').send(userData({ email: user.email }));
      expectError(res, 409, 'DUPLICATE_EMAIL');
    });

    it('email inválido → 400 INVALID_EMAIL', async () => {
      const res = await request(app).post('/api/users').send(userData({ email: 'ana@' }));
      expectError(res, 400, 'INVALID_EMAIL');
    });
  });
});
