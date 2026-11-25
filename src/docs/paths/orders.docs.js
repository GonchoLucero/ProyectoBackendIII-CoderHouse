import {
  InvalidStatusError,
  InvalidPriorityError,
  InvalidPaginationError,
  MissingFieldsError,
  ValidationError,
  OrderNotFoundError,
  UserNotFoundError,
  InvalidStatusTransitionError,
} from '../../errors/index.js';
import { ORDER_STATUS, ORDER_PRIORITY, ORDER_STATUS_TRANSITIONS, PAGINATION, USER_ROLES } from '../../constants/index.js';
import { ref, success, errors, sample, pathParam, queryParam, jsonBody } from '../helpers.js';
import { serverErrors, invalidJson } from './common.js';

const ID = '6650f0c2a1b2c3d4e5f60718';

export const ordersPaths = {
  '/api/orders': {
    get: {
      tags: ['Orders'],
      summary: 'Listar pedidos',
      description: 'Lista paginada de pedidos con el cliente populado. Se puede filtrar por estado y prioridad.',
      parameters: [
        queryParam('status', 'Filtra por estado del pedido', { type: 'string', enum: Object.values(ORDER_STATUS) }),
        queryParam('priority', 'Filtra por prioridad', { type: 'string', enum: Object.values(ORDER_PRIORITY) }),
        queryParam('limit', `Resultados por página (máx. ${PAGINATION.MAX_LIMIT})`, { type: 'integer', minimum: 1, default: PAGINATION.DEFAULT_LIMIT }),
        queryParam('page', 'Número de página', { type: 'integer', minimum: 1, default: 1 }),
      ],
      responses: {
        200: success('Listado de pedidos', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            orders: { type: 'array', items: ref('Order') },
            pagination: ref('Pagination'),
          },
        }),
        ...errors('GET', '/api/orders', {
          400: [
            sample(new InvalidStatusError('PERDIDO', ORDER_STATUS), '/api/orders?status=PERDIDO'),
            sample(new InvalidPriorityError('MAXIMA', ORDER_PRIORITY), '/api/orders?priority=MAXIMA'),
            sample(new InvalidPaginationError('page', '0'), '/api/orders?page=0'),
          ],
          ...serverErrors,
        }),
      },
    },
    post: {
      tags: ['Orders'],
      summary: 'Crear pedido',
      description:
        'Crea un pedido en estado PENDING para un cliente (rol USER) y su entrega en estado PENDING_ASSIGNMENT, sin repartidor. El total se calcula a partir de los ítems.',
      requestBody: jsonBody(ref('OrderInput'), {
        user: ID,
        items: [{ title: 'Caja mediana', quantity: 2, unitPrice: 1500 }],
        priority: ORDER_PRIORITY.HIGH,
        shippingAddress: { street: 'San Martín 123', city: 'Rosario', province: 'Santa Fe', zipCode: '2000' },
      }),
      responses: {
        201: success('Pedido y entrega creados', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            payload: {
              type: 'object',
              properties: { order: ref('Order'), delivery: ref('Delivery') },
            },
          },
        }),
        ...errors('POST', '/api/orders', {
          400: [
            sample(new MissingFieldsError(['items', 'shippingAddress'])),
            sample(new MissingFieldsError(['shippingAddress.zipCode'])),
            sample(new ValidationError('La cantidad del ítem 0 debe ser un entero mayor a 0', { field: 'items[0].quantity', value: 0 })),
            sample(new ValidationError(`Solo los usuarios con rol ${USER_ROLES.USER} pueden tener pedidos`, { field: 'user', role: USER_ROLES.COURIER })),
            sample(new InvalidPriorityError('MAXIMA', ORDER_PRIORITY)),
            invalidJson,
          ],
          404: [sample(new UserNotFoundError(ID))],
          ...serverErrors,
        }),
      },
    },
  },
  '/api/orders/{oid}': {
    get: {
      tags: ['Orders'],
      summary: 'Obtener pedido por id',
      parameters: [pathParam('oid', 'Id del pedido')],
      responses: {
        200: success('Pedido encontrado', {
          type: 'object',
          properties: { status: { type: 'string' }, payload: ref('Order') },
        }),
        ...errors('GET', `/api/orders/${ID}`, { 404: [sample(new OrderNotFoundError(ID))], ...serverErrors }),
      },
    },
  },
  '/api/orders/{oid}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Actualizar el estado de un pedido',
      description: [
        'Cambia el estado del pedido y sincroniza su entrega. Transiciones permitidas:',
        '',
        ...Object.entries(ORDER_STATUS_TRANSITIONS).map(
          ([from, to]) => `- \`${from}\` → ${to.length ? to.map((t) => `\`${t}\``).join(', ') : 'estado final'}`
        ),
        '',
        'Efecto en la entrega: CONFIRMED con `courier` → ASSIGNED · SHIPPED → IN_TRANSIT (requiere repartidor) · DELIVERED → DELIVERED (con deliveredAt) · CANCELLED → CANCELLED.',
      ].join('\n'),
      parameters: [pathParam('oid', 'Id del pedido')],
      requestBody: jsonBody(ref('OrderStatusUpdate'), { status: ORDER_STATUS.CONFIRMED, courier: ID }),
      responses: {
        200: success('Estado actualizado', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            payload: { type: 'object', properties: { order: ref('Order'), delivery: ref('Delivery') } },
          },
        }),
        ...errors('PATCH', `/api/orders/${ID}/status`, {
          400: [
            sample(new MissingFieldsError(['status'])),
            sample(new InvalidStatusError('PERDIDO', ORDER_STATUS)),
            sample(new ValidationError('Para despachar el pedido hace falta un repartidor: enviá "courier" en el body', { field: 'courier' })),
            sample(new ValidationError(`El repartidor debe ser un usuario con rol ${USER_ROLES.COURIER}`, { field: 'courier', role: USER_ROLES.USER })),
            invalidJson,
          ],
          404: [sample(new OrderNotFoundError(ID)), sample(new UserNotFoundError(ID))],
          409: [
            sample(
              new InvalidStatusTransitionError(
                ORDER_STATUS.DELIVERED,
                ORDER_STATUS.PENDING,
                ORDER_STATUS_TRANSITIONS[ORDER_STATUS.DELIVERED]
              )
            ),
          ],
          ...serverErrors,
        }),
      },
    },
  },
};
