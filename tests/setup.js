import dotenv from 'dotenv';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
dotenv.config({ path: '.env.test', quiet: true });
process.env.PORT ||= '8081';
process.env.BCRYPT_SALT_ROUNDS ||= '4';

let memoryServer = null;

if (!process.env.MONGODB_URI) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri('shipnow_test');
}

const dbName = new URL(process.env.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
if (!/test/i.test(dbName)) {
  throw new Error(
    `[tests] La base de testing debe tener "test" en el nombre (recibido: "${dbName || 'sin nombre'}"). ` +
      'Esto evita borrar datos reales. Revisá MONGODB_URI en .env.test.'
  );
}

export const mochaHooks = {
  async beforeAll() {
    const { connectDB } = await import('../src/config/db.config.js');
    await connectDB();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  },
  async afterAll() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
  },
};
