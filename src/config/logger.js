import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { NODE_ENVS, LOG_LEVELS, LOG_COLORS, LOG_FILES } from '../constants/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

winston.addColors(LOG_COLORS);

const LEVEL_COLUMN_WIDTH = 10;

export const formatLine = (info) => {
  const { timestamp: time, level, message, stack, ...meta } = info;
  const rawLevel = info[Symbol.for('level')] ?? level;
  const padding = ' '.repeat(Math.max(1, LEVEL_COLUMN_WIDTH - rawLevel.length - 2));
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const trace = stack ? `\n${stack}` : '';
  return `${time} [${level}]${padding}${message}${extra}${trace}`;
};

const baseFormat = [errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })];
const fileFormat = combine(...baseFormat, printf(formatLine));
const consoleFormat = (useColors) =>
  useColors ? combine(...baseFormat, colorize(), printf(formatLine)) : fileFormat;

export const resolveLevel = (nodeEnv) =>
  nodeEnv === NODE_ENVS.PRODUCTION ? 'info' : 'debug';

const buildTransports = (nodeEnv) => {
  const isTest = nodeEnv === NODE_ENVS.TEST;
  const isProduction = nodeEnv === NODE_ENVS.PRODUCTION;

  const transports = [
    new winston.transports.Console({
      format: consoleFormat(!isProduction),
      silent: isTest,
    }),
  ];

  if (isTest) return transports;

  fs.mkdirSync(LOG_FILES.DIR, { recursive: true });

  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_FILES.DIR, LOG_FILES.ERROR_FILE),
      level: 'error',
      format: fileFormat,
      maxsize: LOG_FILES.ERROR_MAX_SIZE_BYTES,
      maxFiles: LOG_FILES.ERROR_MAX_FILES,
      tailable: true,
    }),
    new winston.transports.DailyRotateFile({
      dirname: LOG_FILES.DIR,
      filename: LOG_FILES.ROTATING_PATTERN,
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: LOG_FILES.ROTATING_MAX_SIZE,
      maxFiles: LOG_FILES.ROTATING_RETENTION,
      zippedArchive: true,
    })
  );

  return transports;
};

const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: 'debug',
  transports: [new winston.transports.Console({ format: consoleFormat(true) })],
  exitOnError: false,
});

let configuredEnv = null;

export const configureLogger = (nodeEnv) => {
  if (configuredEnv === nodeEnv) return logger;
  configuredEnv = nodeEnv;
  logger.clear();
  logger.level = resolveLevel(nodeEnv);
  buildTransports(nodeEnv).forEach((transport) => logger.add(transport));
  return logger;
};

const FLUSH_DELAY_MS = 500;
let exiting = false;

export const flushAndExit = (code = 1) => {
  if (exiting) return;
  exiting = true;
  setTimeout(() => process.exit(code), FLUSH_DELAY_MS);
};

export default logger;
