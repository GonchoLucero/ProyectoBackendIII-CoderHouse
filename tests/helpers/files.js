import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../../src/config/index.js';

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
export const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
export const TEXT = Buffer.from('esto no es un documento permitido');

export const uploadsRoot = () => path.resolve(config.uploadsDir);

export const clearUploads = () => fs.rm(uploadsRoot(), { recursive: true, force: true });

export const listUploadedFiles = async () => {
  try {
    const entries = await fs.readdir(uploadsRoot(), { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => path.relative(uploadsRoot(), path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join('/'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
};

export const absoluteFromStoredPath = (storedPath) => {
  const prefix = config.uploadsDir.split(path.sep).join('/');
  return path.resolve(config.uploadsDir, path.posix.relative(prefix, storedPath));
};
