import config from './config/index.js';
import { connectDB } from './config/db.config.js';
import app from './app.js';

const start = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`[server] ShipNow API escuchando en http://localhost:${config.port} (${config.nodeEnv})`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

start();

process.on('unhandledRejection', (reason) => {
  console.error('[process] Promesa rechazada sin manejar:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[process] Excepción no capturada:', error);
  process.exit(1);
});
