import dotenv from 'dotenv';
import { NODE_ENVS } from '../constants/index.js';

dotenv.config({ quiet: true });

const REQUIRED_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];

const missing = REQUIRED_VARS.filter(
  (key) => !process.env[key] || process.env[key].trim() === ''
);

if (missing.length > 0) {
  throw new Error(
    `[config] Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
      'Revisá tu archivo .env (podés copiar .env.example como base).'
  );
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`[config] PORT debe ser un número entre 1 y 65535. Valor recibido: "${process.env.PORT}"`);
}

const validEnvs = Object.values(NODE_ENVS);
if (!validEnvs.includes(process.env.NODE_ENV)) {
  throw new Error(
    `[config] NODE_ENV inválido: "${process.env.NODE_ENV}". Valores permitidos: ${validEnvs.join(', ')}`
  );
}

if (!/^mongodb(\+srv)?:\/\//.test(process.env.MONGODB_URI)) {
  throw new Error('[config] MONGODB_URI debe comenzar con "mongodb://" o "mongodb+srv://"');
}

const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
});

export default config;
