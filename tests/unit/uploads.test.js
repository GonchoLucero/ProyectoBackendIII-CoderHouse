import assert from 'node:assert/strict';
import multer from 'multer';
import { mapUploadError } from '../../src/config/multer.config.js';
import { InvalidFileTypeError } from '../../src/errors/index.js';
import { UPLOAD_LIMITS } from '../../src/constants/index.js';

describe('mapUploadError (errores de Multer → errores del dominio)', () => {
  it('LIMIT_FILE_SIZE → FILE_TOO_LARGE (413)', () => {
    const err = mapUploadError(new multer.MulterError('LIMIT_FILE_SIZE', 'document'), 'document');
    assert.equal(err.code, 'FILE_TOO_LARGE');
    assert.equal(err.statusCode, 413);
    assert.deepEqual(err.details, { maxBytes: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES });
  });

  it('LIMIT_UNEXPECTED_FILE → UNEXPECTED_FILE_FIELD (400) con el campo esperado', () => {
    const err = mapUploadError(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'archivo'), 'document');
    assert.equal(err.code, 'UNEXPECTED_FILE_FIELD');
    assert.deepEqual(err.details, { received: 'archivo', expected: 'document' });
  });

  it('los errores del dominio pasan sin cambios', () => {
    const original = new InvalidFileTypeError('text/plain', ['application/pdf']);
    assert.equal(mapUploadError(original, 'document'), original);
  });

  it('un error del disco → FILE_SAVE_FAILED (500)', () => {
    const err = mapUploadError(Object.assign(new Error('no space'), { code: 'ENOSPC' }), 'document');
    assert.equal(err.code, 'FILE_SAVE_FAILED');
    assert.equal(err.statusCode, 500);
  });

  it('un formulario multipart mal formado → VALIDATION_ERROR (400)', () => {
    const err = mapUploadError(new Error('Unexpected end of form'), 'document');
    assert.equal(err.code, 'VALIDATION_ERROR');
  });
});
