import { LOG_LEVELS, LOG_FILES } from '../../constants/index.js';
import { ref, success, errors, sample } from '../helpers.js';
import { InternalEndpointDisabledError } from '../../errors/index.js';

export const loggerPaths = {
  '/api/logger/test': {
    get: {
      tags: ['Logger'],
      summary: 'Probar el logger (herramienta interna)',
      description:
        '**Herramienta de validación, no es una funcionalidad del negocio.** Genera un log de cada nivel (debug, http, info, warning, error, fatal) para verificar que aparecen en la consola y en los archivos de `logs/`. En `logs/error.log` solo quedan error y fatal.',
      responses: {
        200: success(
          'Se generó un log de cada nivel',
          {
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' },
              nivelActivo: ref('LogLevel'),
              niveles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nivel: ref('LogLevel'),
                    mensaje: { type: 'string' },
                    seMuestra: { type: 'boolean', description: 'Si el nivel se registra en el entorno actual' },
                    seGuardaEnErrorLog: { type: 'boolean', description: 'Si el nivel se guarda en logs/error.log' },
                  },
                },
              },
              archivos: {
                type: 'object',
                properties: { errores: { type: 'string' }, rotados: { type: 'string' } },
              },
            },
          },
          {
            status: 'success',
            message: 'Se generó un log de cada nivel',
            nivelActivo: 'debug',
            niveles: Object.keys(LOG_LEVELS)
              .sort((a, b) => LOG_LEVELS[b] - LOG_LEVELS[a])
              .map((nivel) => ({
                nivel,
                mensaje: `Prueba de log ${nivel.toUpperCase()}: ...`,
                seMuestra: true,
                seGuardaEnErrorLog: LOG_LEVELS[nivel] <= LOG_LEVELS.error,
              })),
            archivos: {
              errores: `${LOG_FILES.DIR}/${LOG_FILES.ERROR_FILE}`,
              rotados: `${LOG_FILES.DIR}/${LOG_FILES.ROTATING_PATTERN}`,
            },
          }
        ),
        ...errors('GET', '/api/logger/test', { 403: [sample(new InternalEndpointDisabledError('/api/logger/test'))] }),
      },
    },
  },
};
