import dotenv from 'dotenv';
import { NODE_ENVS, LOG_LEVELS } from '../constants/index.js';
import { configureLogger } from './logger.js';

dotenv.config({ quiet: true });

configureLogger(Object.values(NODE_ENVS).includes(process.env.NODE_ENV) ? process.env.NODE_ENV : NODE_ENVS.DEVELOPMENT);

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

const isProduction = process.env.NODE_ENV === NODE_ENVS.PRODUCTION;

const optional = (key) => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const parseBoolean = (key, defaultValue) => {
  const value = optional(key);
  if (value === undefined) return defaultValue;
  if (!['true', 'false'].includes(value.toLowerCase())) {
    throw new Error(`[config] ${key} debe ser "true" o "false". Valor recibido: "${value}"`);
  }
  return value.toLowerCase() === 'true';
};

const logLevel = optional('LOG_LEVEL');
if (logLevel && !Object.keys(LOG_LEVELS).includes(logLevel)) {
  throw new Error(
    `[config] LOG_LEVEL inválido: "${logLevel}". Valores permitidos: ${Object.keys(LOG_LEVELS).join(', ')}`
  );
}

const publicUrl = optional('PUBLIC_URL') ?? `http://localhost:${port}`;
if (!/^https?:\/\/[^\s]+$/.test(publicUrl)) {
  throw new Error(`[config] PUBLIC_URL debe ser una URL http(s) válida. Valor recibido: "${publicUrl}"`);
}

const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  uploadsDir: optional('UPLOADS_DIR') ?? 'uploads',
  logLevel,
  publicUrl: publicUrl.replace(/\/+$/, ''),
  internalEndpointsEnabled: parseBoolean('ENABLE_INTERNAL_ENDPOINTS', !isProduction),
  swaggerEnabled: parseBoolean('SWAGGER_ENABLED', !isProduction),
});

configureLogger(config.nodeEnv, config.logLevel);

export default config;
