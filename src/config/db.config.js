import mongoose from 'mongoose';
import config from './index.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[db] Conectado a MongoDB');
  } catch (error) {
    throw new Error(`[db] No se pudo conectar a MongoDB: ${error.message}`);
  }
};
