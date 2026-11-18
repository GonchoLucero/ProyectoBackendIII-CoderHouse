import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';

const watchConnection = () => {
  mongoose.connection.on('disconnected', () => logger.warning('Se perdió la conexión con MongoDB'));
  mongoose.connection.on('reconnected', () => logger.info('Conexión a MongoDB restablecida'));
  mongoose.connection.on('error', (error) => logger.error(`Error en la conexión con MongoDB: ${error.message}`));
};

export const connectDB = async () => {
  try {
    logger.debug('Conectando a MongoDB...');
    await mongoose.connect(config.mongoUri);
    logger.info('Conexión a MongoDB establecida');
    watchConnection();
  } catch (error) {
    logger.error(`Error al conectar con MongoDB: ${error.message}`);
    throw new Error(`[db] No se pudo conectar a MongoDB: ${error.message}`);
  }
};
