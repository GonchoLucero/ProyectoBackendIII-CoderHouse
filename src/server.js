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
    const { connectDB, disconnectDB } = await import('./config/db.config.js');
    const { cleanStaleTmpUploads } = await import('./config/multer.config.js');
    const { default: app } = await import('./app.js');

    await connectDB();
    await cleanStaleTmpUploads();

    const server = app.listen(config.port, () => {
      logger.info(`Servidor ShipNow escuchando en el puerto ${config.port} (${config.nodeEnv})`);
      logger.info(
        `Swagger: ${config.swaggerEnabled ? `${config.publicUrl}/api/docs` : 'deshabilitado'} · Endpoints internos: ${config.internalEndpointsEnabled ? 'habilitados' : 'deshabilitados'}`
      );
    });

    const shutdown = (signal) => {
      logger.info(`Señal ${signal} recibida: cerrando el servidor`);
      server.close(async () => {
        await disconnectDB();
        flushAndExit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal(`No se pudo iniciar el servidor: ${error.message}`);
    flushAndExit(1);
  }
};

start();
