import fs from 'node:fs/promises';
import path from 'node:path';

export const moveFile = async (sourcePath, targetDir, fileName) => {
  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, fileName);
  try {
    await fs.rename(sourcePath, targetPath);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(sourcePath, targetPath);
    await fs.unlink(sourcePath);
  }
  return targetPath;
};

export const removeFile = async (filePath) => {
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
};
