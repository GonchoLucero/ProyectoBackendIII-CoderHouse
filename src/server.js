import logger, { flushAndExit } from './config/logger.js';

process.on('unhandledRejection', (reason) => {
  logger.fatal(`Promesa rechazada sin manejar: ${reason?.message ?? reason}`, { stack: reason?.stack });
  flushAndExit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal(`Excepción no capturada: ${error.message}`, { stack: error.stack });
  flushAndExit(1);
});

const start = async () => {
  try {
    const { default: config } = await import('./config/index.js');
    const { connectDB } = await import('./config/db.config.js');
    const { default: app } = await import('./app.js');

    await connectDB();
    app.listen(config.port, () => {
      logger.info(`Servidor ShipNow escuchando en el puerto ${config.port} (${config.nodeEnv})`);
    });
  } catch (error) {
    logger.fatal(`No se pudo iniciar el servidor: ${error.message}`);
    flushAndExit(1);
  }
};

start();
