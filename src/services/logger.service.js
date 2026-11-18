import logger from '../config/logger.js';
import { LOG_LEVELS, LOG_FILES } from '../constants/index.js';

const TEST_MESSAGES = Object.freeze({
  fatal: 'Prueba de log FATAL: falla crítica simulada',
  error: 'Prueba de log ERROR: error inesperado simulado',
  warning: 'Prueba de log WARNING: pedido #TEST-001 sin repartidor asignado',
  info: 'Prueba de log INFO: operación completada',
  http: 'Prueba de log HTTP: request simulado',
  debug: 'Prueba de log DEBUG: detalle interno para depuración',
});

class LoggerService {
  emitTestLogs() {
    const levels = Object.keys(LOG_LEVELS).sort((a, b) => LOG_LEVELS[b] - LOG_LEVELS[a]);
    levels.forEach((level) => logger[level](TEST_MESSAGES[level]));

    const activeLevel = logger.level;
    return {
      nivelActivo: activeLevel,
      niveles: levels.map((level) => ({
        nivel: level,
        mensaje: TEST_MESSAGES[level],
        seMuestra: LOG_LEVELS[level] <= LOG_LEVELS[activeLevel],
        seGuardaEnErrorLog: LOG_LEVELS[level] <= LOG_LEVELS.error,
      })),
      archivos: {
        errores: `${LOG_FILES.DIR}/${LOG_FILES.ERROR_FILE}`,
        rotados: `${LOG_FILES.DIR}/${LOG_FILES.ROTATING_PATTERN}`,
      },
    };
  }
}

export default new LoggerService();
