import { InvalidStatusError, InvalidPaginationError, DeliveryNotFoundError } from '../../errors/index.js';
import { DELIVERY_STATUS, PAGINATION } from '../../constants/index.js';
import { ref, success, errors, sample, pathParam, queryParam } from '../helpers.js';
import { serverErrors } from './common.js';

const ID = '6650f0c2a1b2c3d4e5f60718';

export const deliveriesPaths = {
  '/api/deliveries': {
    get: {
      tags: ['Deliveries'],
      summary: 'Listar entregas',
      description: 'Lista paginada de entregas con su pedido y repartidor populados. Se puede filtrar por estado.',
      parameters: [
        queryParam('status', 'Filtra por estado de la entrega', { type: 'string', enum: Object.values(DELIVERY_STATUS) }),
        queryParam('limit', `Resultados por página (máx. ${PAGINATION.MAX_LIMIT})`, { type: 'integer', minimum: 1, default: PAGINATION.DEFAULT_LIMIT }),
        queryParam('page', 'Número de página', { type: 'integer', minimum: 1, default: 1 }),
      ],
      responses: {
        200: success('Listado de entregas', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            deliveries: { type: 'array', items: ref('Delivery') },
            pagination: ref('Pagination'),
          },
        }),
        ...errors('GET', '/api/deliveries', {
          400: [
            sample(new InvalidStatusError('PERDIDA', DELIVERY_STATUS), '/api/deliveries?status=PERDIDA'),
            sample(new InvalidPaginationError('limit', 'abc'), '/api/deliveries?limit=abc'),
          ],
          ...serverErrors,
        }),
      },
    },
  },
  '/api/deliveries/{did}': {
    get: {
      tags: ['Deliveries'],
      summary: 'Obtener entrega por id',
      parameters: [pathParam('did', 'Id de la entrega')],
      responses: {
        200: success('Entrega encontrada', {
          type: 'object',
          properties: { status: { type: 'string' }, payload: ref('Delivery') },
        }),
        ...errors('GET', `/api/deliveries/${ID}`, { 404: [sample(new DeliveryNotFoundError(ID))], ...serverErrors }),
      },
    },
  },
};
