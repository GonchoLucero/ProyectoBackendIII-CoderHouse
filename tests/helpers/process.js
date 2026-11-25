import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const baseEnv = (cwd) => ({
  PATH: process.env.PATH,
  PORT: '8090',
  MONGODB_URI: 'mongodb://127.0.0.1:1/shipnow_process_test',
  UPLOADS_DIR: path.join(cwd, 'uploads_test'),
});

const makeTmpDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'shipnow-process-test-'));

export const startApp = async (env = {}) => {
  const cwd = await makeTmpDir();
  const appUrl = pathToFileURL(path.join(ROOT, 'src/app.js')).href;
  const script = `const { default: app } = await import(${JSON.stringify(appUrl)});
const server = app.listen(0, () => console.log('PORT=' + server.address().port));`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    cwd,
    env: { ...baseEnv(cwd), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const port = await new Promise((resolve, reject) => {
    let output = '';
    const onData = (chunk) => {
      output += chunk;
      const match = output.match(/PORT=(\d+)/);
      if (match) resolve(Number(match[1]));
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => reject(new Error(`La app terminó con código ${code}: ${output}`)));
  });

  return {
    url: `http://127.0.0.1:${port}`,
    stop: async () => {
      child.kill();
      await fs.rm(cwd, { recursive: true, force: true });
    },
  };
};

export const runServer = async (env = {}, timeoutMs = 15000) => {
  const cwd = await makeTmpDir();
  const child = spawn(process.execPath, [path.join(ROOT, 'src/server.js')], {
    cwd,
    env: { PATH: process.env.PATH, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (c) => (output += c));
  child.stderr.on('data', (c) => (output += c));
  const code = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill();
      resolve(null);
    }, timeoutMs);
    child.on('exit', (exitCode) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
  });
  await fs.rm(cwd, { recursive: true, force: true });
  return { code, output: output.replace(/\x1b\[[0-9;]*m/g, '') };
};
