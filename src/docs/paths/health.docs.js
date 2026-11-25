import { NODE_ENVS } from '../../constants/index.js';
import { success } from '../helpers.js';

export const healthPaths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      description:
        'Estado básico de la API para monitoreo y para el HEALTHCHECK del contenedor. No expone información sensible (ni variables de entorno, ni URIs, ni versiones). Siempre está habilitado.',
      responses: {
        200: success(
          'La API está levantada',
          {
            type: 'object',
            properties: {
              status: { type: 'string' },
              api: { type: 'string', enum: ['ok'] },
              environment: { type: 'string', enum: Object.values(NODE_ENVS) },
              uptime: { type: 'integer', description: 'Segundos desde que arrancó el proceso' },
              timestamp: { type: 'string', format: 'date-time' },
              database: { type: 'string', enum: ['connected', 'connecting', 'disconnecting', 'disconnected', 'unknown'] },
            },
          },
          {
            status: 'success',
            api: 'ok',
            environment: NODE_ENVS.PRODUCTION,
            uptime: 3600,
            timestamp: '2026-11-25T03:00:00.000Z',
            database: 'connected',
          }
        ),
      },
    },
  },
};
