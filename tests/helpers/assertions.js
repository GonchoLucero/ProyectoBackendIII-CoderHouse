import { expect } from 'chai';
import { RESPONSE_STATUS } from '../../src/constants/index.js';
import { ERRORS } from '../../src/errors/index.js';

export const expectError = (res, status, code) => {
  expect(res.status, JSON.stringify(res.body)).to.equal(status);
  expect(res.headers['content-type']).to.match(/application\/json/);
  expect(res.body).to.have.all.keys('status', 'error', 'method', 'path', 'timestamp');
  expect(res.body.status).to.equal(RESPONSE_STATUS.ERROR);
  expect(res.body.error).to.include.keys('code', 'message');
  expect(res.body.error.code).to.equal(code);
  expect(ERRORS[code].status).to.equal(status);
  expect(res.body.error.message).to.be.a('string').and.not.empty;
  expect(res.body.method).to.equal(res.req.method);
  expect(Date.parse(res.body.timestamp)).to.not.be.NaN;
};

export const expectSuccess = (res, status) => {
  expect(res.status, JSON.stringify(res.body)).to.equal(status);
  expect(res.body.status).to.equal(RESPONSE_STATUS.SUCCESS);
};

export const expectPagination = (pagination, { total, page = 1, limit = 10 }) => {
  expect(pagination).to.deep.equal({ total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
};
