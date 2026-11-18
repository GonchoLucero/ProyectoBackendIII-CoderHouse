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
