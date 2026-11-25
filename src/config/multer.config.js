import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import config from './index.js';
import logger from './logger.js';
import {
  AppError,
  InvalidFileTypeError,
  FileTooLargeError,
  UnexpectedFileFieldError,
  FileSaveError,
  ValidationError,
} from '../errors/index.js';
import { ALLOWED_MIME_TYPES, UPLOAD_FOLDERS, UPLOAD_LIMITS, TMP_UPLOAD_MAX_AGE_MS } from '../constants/index.js';

export const resolveUploadPath = (...segments) => path.resolve(config.uploadsDir, ...segments);

export const toStoredPath = (folder, fileName) => path.posix.join(config.uploadsDir.split(path.sep).join('/'), folder, fileName);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = resolveUploadPath(UPLOAD_FOLDERS.TMP);
    fs.mkdir(tmpDir, { recursive: true }, (err) => cb(err, tmpDir));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${unique}${ALLOWED_MIME_TYPES[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) return cb(null, true);
  logger.warning(
    `Intento de subir un tipo de archivo no permitido: "${file.originalname}" (${file.mimetype}) - ${req.method} ${req.originalUrl}`
  );
  return cb(new InvalidFileTypeError(file.mimetype, Object.keys(ALLOWED_MIME_TYPES)));
};

export const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES, files: UPLOAD_LIMITS.MAX_FILES },
});

const MULTER_ERRORS = Object.freeze({
  LIMIT_FILE_SIZE: () => new FileTooLargeError(UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES),
  LIMIT_UNEXPECTED_FILE: (err, expected) => new UnexpectedFileFieldError(err.field, expected),
  LIMIT_FILE_COUNT: (err, expected) => new UnexpectedFileFieldError(err.field, expected),
});

export const mapUploadError = (err, expectedField) => {
  if (err instanceof AppError) return err;
  if (err instanceof multer.MulterError) {
    const build = MULTER_ERRORS[err.code];
    return build ? build(err, expectedField) : new ValidationError(`Error en la carga del archivo: ${err.message}`, { code: err.code });
  }
  if (typeof err?.code === 'string' && err.code.startsWith('E')) return new FileSaveError(err.message, err);
  return new ValidationError('El formulario multipart/form-data es inválido', { motivo: err?.message });
};

export const cleanStaleTmpUploads = async (maxAgeMs = TMP_UPLOAD_MAX_AGE_MS) => {
  const tmpDir = resolveUploadPath(UPLOAD_FOLDERS.TMP);
  const entries = await fsp.readdir(tmpDir, { withFileTypes: true }).catch(() => []);
  const now = Date.now();
  let removed = 0;
  for (const entry of entries.filter((e) => e.isFile())) {
    const filePath = path.join(tmpDir, entry.name);
    const { mtimeMs } = await fsp.stat(filePath);
    if (now - mtimeMs > maxAgeMs) {
      await fsp.rm(filePath, { force: true });
      removed += 1;
    }
  }
  if (removed) logger.info(`Se borraron ${removed} archivos temporales viejos de ${tmpDir}`);
  return removed;
};
