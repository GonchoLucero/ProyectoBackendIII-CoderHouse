import fs from 'node:fs/promises';
import { mock } from 'node:test';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import logger from '../../src/config/logger.js';
import {
  DOCUMENT_TYPES,
  ORDER_RECEIPT_TYPES,
  DELIVERY_RECEIPT_TYPES,
  UPLOAD_FOLDERS,
  UPLOAD_LIMITS,
  ALLOWED_MIME_TYPES,
} from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectError, expectSuccess } from '../helpers/assertions.js';
import { createUser, createCourier, createOrder, NON_EXISTENT_ID } from '../helpers/factories.js';
import { PDF, PNG, TEXT, clearUploads, listUploadedFiles, absoluteFromStoredPath } from '../helpers/files.js';

const METADATA_KEYS = ['_id', 'originalName', 'fileName', 'path', 'mimetype', 'size', 'documentType', 'uploadedAt'];

const expectNoFilesLeft = async () => expect(await listUploadedFiles()).to.deep.equal([]);

const expectStoredFile = async (metadata, folder, buffer) => {
  expect(metadata).to.have.all.keys(...METADATA_KEYS);
  expect(metadata.path).to.match(new RegExp(`${folder}/${metadata.fileName}$`));
  expect(await listUploadedFiles()).to.deep.equal([`${folder}/${metadata.fileName}`]);
  const content = await fs.readFile(absoluteFromStoredPath(metadata.path));
  expect(content.equals(buffer)).to.equal(true);
};

describe('Uploads — carga de archivos (multipart/form-data)', () => {
  beforeEach(async () => {
    await clearDatabase();
    await clearUploads();
  });
  afterEach(() => mock.restoreAll());
  after(async () => {
    await clearDatabase();
    await clearUploads();
  });

  describe('POST /api/users/:uid/documents', () => {
    let user;
    beforeEach(async () => {
      user = await createUser();
    });

    const upload = (uid) => request(app).post(`/api/users/${uid}/documents`);

    it('sube un documento válido, lo guarda en su carpeta y registra los metadatos en el usuario', async () => {
      const res = await upload(user._id)
        .field('documentType', DOCUMENT_TYPES.IDENTIFICATION)
        .attach('document', PDF, { filename: 'dni-frente.pdf', contentType: 'application/pdf' });

      expectSuccess(res, 201);
      const { document, user: updated } = res.body.payload;
      expect(document).to.include({
        originalName: 'dni-frente.pdf',
        mimetype: 'application/pdf',
        size: PDF.length,
        documentType: DOCUMENT_TYPES.IDENTIFICATION,
      });
      expect(document.fileName).to.match(/^\d+-[0-9a-f]{16}\.pdf$/);
      await expectStoredFile(document, UPLOAD_FOLDERS.USER_DOCUMENTS, PDF);

      expect(updated._id).to.equal(user._id);
      expect(updated.documents).to.have.lengthOf(1);
      expect(updated.documents[0]).to.have.all.keys(...METADATA_KEYS);
      expect(updated).to.not.have.property('password');
    });

    it('en la base quedan solo los metadatos y se acumulan los documentos', async () => {
      await upload(user._id).field('documentType', DOCUMENT_TYPES.IDENTIFICATION).attach('document', PDF, 'dni.pdf');
      await upload(user._id)
        .field('documentType', DOCUMENT_TYPES.PROOF_OF_ADDRESS)
        .attach('document', PNG, { filename: 'servicio.png', contentType: 'image/png' });

      const res = await request(app).get(`/api/users/${user._id}`);
      expectSuccess(res, 200);
      expect(res.body.payload.documents.map((d) => d.documentType)).to.deep.equal([
        DOCUMENT_TYPES.IDENTIFICATION,
        DOCUMENT_TYPES.PROOF_OF_ADDRESS,
      ]);
      res.body.payload.documents.forEach((d) => expect(d).to.have.all.keys(...METADATA_KEYS));
      expect(await listUploadedFiles()).to.have.lengthOf(2);
    });

    it('la licencia de un repartidor se guarda en la carpeta de licencias', async () => {
      const courier = await createCourier();
      const res = await upload(courier._id)
        .field('documentType', DOCUMENT_TYPES.DRIVER_LICENSE)
        .attach('document', PNG, { filename: 'licencia.png', contentType: 'image/png' });

      expectSuccess(res, 201);
      await expectStoredFile(res.body.payload.document, UPLOAD_FOLDERS.COURIER_LICENSES, PNG);
    });

    it('registra la carga exitosa en el logger', async () => {
      const info = mock.method(logger, 'info', () => {});
      await upload(user._id).field('documentType', DOCUMENT_TYPES.IDENTIFICATION).attach('document', PDF, 'dni.pdf');
      expect(info.mock.calls.some((c) => /Documento IDENTIFICATION cargado/.test(c.arguments[0]))).to.equal(true);
    });

    it('sin archivo → 400 FILE_REQUIRED', async () => {
      const res = await upload(user._id).field('documentType', DOCUMENT_TYPES.IDENTIFICATION);
      expectError(res, 400, 'FILE_REQUIRED');
      expect(res.body.error.details).to.deep.equal({ field: 'document' });
    });

    it('sin documentType → 400 MISSING_FIELDS y no deja el archivo en el servidor', async () => {
      const res = await upload(user._id).attach('document', PDF, 'dni.pdf');
      expectError(res, 400, 'MISSING_FIELDS');
      expect(res.body.error.details.fields).to.deep.equal(['documentType']);
      await expectNoFilesLeft();
    });

    it('tipo de documento inválido → 400 INVALID_DOCUMENT_TYPE con los permitidos', async () => {
      const res = await upload(user._id).field('documentType', 'PASAPORTE').attach('document', PDF, 'pasaporte.pdf');
      expectError(res, 400, 'INVALID_DOCUMENT_TYPE');
      expect(res.body.error.details.allowed).to.deep.equal(Object.values(DOCUMENT_TYPES));
      await expectNoFilesLeft();
    });

    it('licencia para un usuario que no es repartidor → 400 INVALID_DOCUMENT_TYPE', async () => {
      const res = await upload(user._id).field('documentType', DOCUMENT_TYPES.DRIVER_LICENSE).attach('document', PDF, 'lic.pdf');
      expectError(res, 400, 'INVALID_DOCUMENT_TYPE');
      expect(res.body.error.message).to.include('COURIER');
      await expectNoFilesLeft();
    });

    it('tipo de archivo no permitido → 415 INVALID_FILE_TYPE y se loguea el intento', async () => {
      const warning = mock.method(logger, 'warning', () => {});
      const res = await upload(user._id)
        .field('documentType', DOCUMENT_TYPES.IDENTIFICATION)
        .attach('document', TEXT, { filename: 'notas.txt', contentType: 'text/plain' });

      expectError(res, 415, 'INVALID_FILE_TYPE');
      expect(res.body.error.details).to.deep.equal({ mimetype: 'text/plain', allowed: Object.keys(ALLOWED_MIME_TYPES) });
      expect(warning.mock.calls.some((c) => /tipo de archivo no permitido/.test(c.arguments[0]))).to.equal(true);
      await expectNoFilesLeft();
    });

    it('archivo demasiado grande → 413 FILE_TOO_LARGE', async () => {
      const big = Buffer.alloc(UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES + 1, 0);
      const res = await upload(user._id)
        .field('documentType', DOCUMENT_TYPES.IDENTIFICATION)
        .attach('document', big, { filename: 'enorme.pdf', contentType: 'application/pdf' });

      expectError(res, 413, 'FILE_TOO_LARGE');
      expect(res.body.error.details).to.deep.equal({ maxBytes: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES });
      await expectNoFilesLeft();
    });

    it('campo de archivo incorrecto → 400 UNEXPECTED_FILE_FIELD', async () => {
      const res = await upload(user._id).field('documentType', DOCUMENT_TYPES.IDENTIFICATION).attach('archivo', PDF, 'dni.pdf');
      expectError(res, 400, 'UNEXPECTED_FILE_FIELD');
      expect(res.body.error.details).to.deep.equal({ received: 'archivo', expected: 'document' });
      await expectNoFilesLeft();
    });

    it('usuario inexistente → 404 USER_NOT_FOUND y no deja el archivo en el servidor', async () => {
      const res = await upload(NON_EXISTENT_ID).field('documentType', DOCUMENT_TYPES.IDENTIFICATION).attach('document', PDF, 'dni.pdf');
      expectError(res, 404, 'USER_NOT_FOUND');
      await expectNoFilesLeft();
    });
  });

  describe('POST /api/orders/:oid/receipts', () => {
    let order;
    beforeEach(async () => {
      const client = await createUser();
      ({ order } = await createOrder(client._id));
    });

    it('asocia un comprobante de pago al pedido (tipo por defecto)', async () => {
      const info = mock.method(logger, 'info', () => {});
      const res = await request(app)
        .post(`/api/orders/${order._id}/receipts`)
        .attach('receipt', PDF, { filename: 'pago.pdf', contentType: 'application/pdf' });

      expectSuccess(res, 201);
      const { receipt, order: updated } = res.body.payload;
      expect(receipt.documentType).to.equal(ORDER_RECEIPT_TYPES.PAYMENT_RECEIPT);
      await expectStoredFile(receipt, UPLOAD_FOLDERS.ORDER_RECEIPTS, PDF);
      expect(updated._id).to.equal(order._id);
      expect(updated.receipts).to.have.lengthOf(1);
      expect(info.mock.calls.some((c) => /Comprobante PAYMENT_RECEIPT asociado al pedido/.test(c.arguments[0]))).to.equal(true);
    });

    it('acepta un receiptType válido', async () => {
      const res = await request(app)
        .post(`/api/orders/${order._id}/receipts`)
        .field('receiptType', ORDER_RECEIPT_TYPES.INVOICE)
        .attach('receipt', PDF, 'factura.pdf');
      expectSuccess(res, 201);
      expect(res.body.payload.receipt.documentType).to.equal(ORDER_RECEIPT_TYPES.INVOICE);
    });

    it('tipo de comprobante inválido → 400 INVALID_DOCUMENT_TYPE', async () => {
      const res = await request(app)
        .post(`/api/orders/${order._id}/receipts`)
        .field('receiptType', DELIVERY_RECEIPT_TYPES.DELIVERY_PROOF)
        .attach('receipt', PDF, 'x.pdf');
      expectError(res, 400, 'INVALID_DOCUMENT_TYPE');
      expect(res.body.error.details.allowed).to.deep.equal(Object.values(ORDER_RECEIPT_TYPES));
      await expectNoFilesLeft();
    });

    it('pedido inexistente → 404 ORDER_NOT_FOUND', async () => {
      const res = await request(app).post(`/api/orders/${NON_EXISTENT_ID}/receipts`).attach('receipt', PDF, 'pago.pdf');
      expectError(res, 404, 'ORDER_NOT_FOUND');
      await expectNoFilesLeft();
    });

    it('sin archivo → 400 FILE_REQUIRED', async () => {
      const res = await request(app).post(`/api/orders/${order._id}/receipts`).send({});
      expectError(res, 400, 'FILE_REQUIRED');
      expect(res.body.error.details).to.deep.equal({ field: 'receipt' });
    });
  });

  describe('POST /api/deliveries/:did/receipts', () => {
    let delivery;
    beforeEach(async () => {
      const client = await createUser();
      ({ delivery } = await createOrder(client._id));
    });

    it('asocia un comprobante de entrega a la entrega', async () => {
      const res = await request(app)
        .post(`/api/deliveries/${delivery._id}/receipts`)
        .attach('receipt', PNG, { filename: 'firma.png', contentType: 'image/png' });

      expectSuccess(res, 201);
      const { receipt, delivery: updated } = res.body.payload;
      expect(receipt.documentType).to.equal(DELIVERY_RECEIPT_TYPES.DELIVERY_PROOF);
      await expectStoredFile(receipt, UPLOAD_FOLDERS.DELIVERY_RECEIPTS, PNG);

      const fetched = await request(app).get(`/api/deliveries/${updated._id}`);
      expect(fetched.body.payload.receipts).to.have.lengthOf(1);
      expect(fetched.body.payload.receipts[0].fileName).to.equal(receipt.fileName);
    });

    it('entrega inexistente → 404 DELIVERY_NOT_FOUND', async () => {
      const res = await request(app).post(`/api/deliveries/${NON_EXISTENT_ID}/receipts`).attach('receipt', PDF, 'x.pdf');
      expectError(res, 404, 'DELIVERY_NOT_FOUND');
      await expectNoFilesLeft();
    });

    it('tipo de archivo no permitido → 415 INVALID_FILE_TYPE', async () => {
      const res = await request(app)
        .post(`/api/deliveries/${delivery._id}/receipts`)
        .attach('receipt', TEXT, { filename: 'a.txt', contentType: 'text/plain' });
      expectError(res, 415, 'INVALID_FILE_TYPE');
    });
  });
});
