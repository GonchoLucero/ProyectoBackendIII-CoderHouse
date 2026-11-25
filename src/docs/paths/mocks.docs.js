import {
  InvalidMockQuantityError,
  NegativeMockQuantityError,
  MockQuantityExceededError,
  EmptyMockRequestError,
  InvalidMockCollectionError,
  MockDependencyError,
  MockGenerationError,
  MockSeedError,
  SeedForbiddenError,
  InternalEndpointDisabledError,
} from '../../errors/index.js';
import { MOCK_COLLECTIONS, MOCK_LIMITS, USER_ROLES } from '../../constants/index.js';
import { ref, success, errors, sample, queryParam } from '../helpers.js';

const qtyParam = queryParam(
  'qty',
  `Cantidad de registros: entero entre 1 y ${MOCK_LIMITS.MAX_QTY} (por defecto ${MOCK_LIMITS.DEFAULT_QTY})`,
  { type: 'integer', minimum: 1, maximum: MOCK_LIMITS.MAX_QTY, default: MOCK_LIMITS.DEFAULT_QTY }
);

const countParam = (name, description) =>
  queryParam(name, `${description}: entero entre 0 y ${MOCK_LIMITS.MAX_QTY} (por defecto ${MOCK_LIMITS.DEFAULT_QTY})`, {
    type: 'integer',
    minimum: 0,
    maximum: MOCK_LIMITS.MAX_QTY,
    default: MOCK_LIMITS.DEFAULT_QTY,
  });

const datasetParams = [
  countParam('users', 'Clientes (rol USER)'),
  countParam('couriers', 'Repartidores (rol COURIER)'),
  countParam('orders', 'Pedidos (cada uno con su entrega)'),
];

const qtyErrors = (path) => [
  sample(new InvalidMockQuantityError('qty', 'abc'), `${path}?qty=abc`),
  sample(new InvalidMockQuantityError('qty', '0', 'debe ser mayor a 0'), `${path}?qty=0`),
  sample(new NegativeMockQuantityError('qty', '-5'), `${path}?qty=-5`),
  sample(new MockQuantityExceededError('qty', '1000', MOCK_LIMITS.MAX_QTY), `${path}?qty=1000`),
];

const datasetErrors = (path) => [
  sample(new NegativeMockQuantityError('users', '-1'), `${path}?users=-1`),
  sample(new EmptyMockRequestError(['users', 'couriers', 'orders']), `${path}?users=0&couriers=0&orders=0`),
  sample(new MockDependencyError('Para generar pedidos hace falta al menos 1 usuario', { required: 'users >= 1' }), `${path}?users=0&orders=5`),
];

const internalDisabled = (path) => sample(new InternalEndpointDisabledError(path));

const generationError = sample(new MockGenerationError('No se pudieron generar los datos de prueba'));

const listResponse = (description, itemSchema, related) =>
  success(description, {
    type: 'object',
    properties: {
      status: { type: 'string' },
      payload: { type: 'array', items: ref(itemSchema) },
      ...(related && { related: { type: 'object', properties: related } }),
    },
  });

const getMock = (path, summary, description, itemSchema, related) => ({
  get: {
    tags: ['Mocks'],
    summary,
    description: `${description} **No guarda nada en la base.**`,
    parameters: [qtyParam],
    responses: {
      200: listResponse('Datos simulados', itemSchema, related),
      ...errors('GET', path, { 400: qtyErrors(path), 403: [internalDisabled(path)], 500: [generationError] }),
    },
  },
});

const seedErrorExamples = {
  403: [sample(new SeedForbiddenError()), internalDisabled('/api/mocks/seed')],
  500: [
    sample(
      new MockSeedError({
        collection: MOCK_COLLECTIONS.ORDERS,
        insertedBeforeError: {
          [MOCK_COLLECTIONS.USERS]: 10,
          [MOCK_COLLECTIONS.COURIERS]: 3,
          [MOCK_COLLECTIONS.ORDERS]: 0,
          [MOCK_COLLECTIONS.DELIVERIES]: 0,
        },
        reason: 'E11000 duplicate key error',
      })
    ),
    generationError,
  ],
};

export const mocksPaths = {
  '/api/mocks/users': getMock(
    '/api/mocks/users',
    'Generar usuarios simulados',
    'Usuarios con roles mezclados (~70% USER, ~20% COURIER, ~10% ADMIN).',
    'MockUser'
  ),
  '/api/mocks/couriers': getMock(
    '/api/mocks/couriers',
    'Generar repartidores simulados',
    'Usuarios con rol COURIER y un vehículo.',
    'MockUser'
  ),
  '/api/mocks/orders': getMock(
    '/api/mocks/orders',
    'Generar pedidos simulados',
    'Pedidos con estados y prioridades válidos. En `related.users` vienen los clientes a los que pertenecen.',
    'MockOrder',
    { users: { type: 'array', items: ref('MockUser') } }
  ),
  '/api/mocks/deliveries': getMock(
    '/api/mocks/deliveries',
    'Generar entregas simuladas',
    'Entregas coherentes con el estado de su pedido. En `related` vienen sus pedidos, repartidores y clientes.',
    'MockDelivery',
    {
      orders: { type: 'array', items: ref('MockOrder') },
      couriers: { type: 'array', items: ref('MockUser') },
      users: { type: 'array', items: ref('MockUser') },
    }
  ),
  '/api/mocks/dataset': {
    get: {
      tags: ['Mocks'],
      summary: 'Generar un dataset completo y relacionado',
      description: 'Devuelve usuarios, repartidores, pedidos y una entrega por pedido, todos relacionados entre sí. **No guarda nada en la base.**',
      parameters: datasetParams,
      responses: {
        200: success('Dataset simulado', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            payload: {
              type: 'object',
              properties: {
                users: { type: 'array', items: ref('MockUser') },
                couriers: { type: 'array', items: ref('MockUser') },
                orders: { type: 'array', items: ref('MockOrder') },
                deliveries: { type: 'array', items: ref('MockDelivery') },
              },
            },
          },
        }),
        ...errors('GET', '/api/mocks/dataset', {
          400: datasetErrors('/api/mocks/dataset'),
          403: [internalDisabled('/api/mocks/dataset')],
          500: [generationError],
        }),
      },
    },
  },
  '/api/mocks/seed': {
    post: {
      tags: ['Mocks'],
      summary: 'Insertar datos de prueba de una colección',
      description: [
        'Inserta `qty` registros de prueba en MongoDB. **No lleva body: todo se envía por query.**',
        '',
        `- \`${MOCK_COLLECTIONS.USERS}\`: usuarios con roles mezclados.`,
        `- \`${MOCK_COLLECTIONS.COURIERS}\`: usuarios con rol ${USER_ROLES.COURIER}.`,
        `- \`${MOCK_COLLECTIONS.ORDERS}\`: necesita usuarios con rol ${USER_ROLES.USER} existentes.`,
        `- \`${MOCK_COLLECTIONS.DELIVERIES}\`: necesita repartidores y pedidos sin entrega.`,
        '',
        `Los usuarios mock se guardan con el password \`coder123\` (hasheado). Deshabilitado con NODE_ENV=production.`,
      ].join('\n'),
      parameters: [
        qtyParam,
        queryParam('coleccion', 'Colección a cargar', {
          type: 'string',
          enum: Object.values(MOCK_COLLECTIONS),
          default: MOCK_COLLECTIONS.USERS,
        }),
      ],
      responses: {
        201: success(
          'Registros insertados',
          {
            type: 'object',
            properties: {
              status: { type: 'string' },
              insertados: { type: 'integer' },
              coleccion: { type: 'string', enum: Object.values(MOCK_COLLECTIONS) },
            },
          },
          { status: 'success', insertados: 10, coleccion: MOCK_COLLECTIONS.USERS }
        ),
        ...errors('POST', '/api/mocks/seed', {
          400: [
            ...qtyErrors('/api/mocks/seed'),
            sample(new InvalidMockCollectionError('mascotas', MOCK_COLLECTIONS), '/api/mocks/seed?coleccion=mascotas'),
            sample(
              new MockDependencyError(`No hay usuarios con rol ${USER_ROLES.USER} en la base`, {
                required: MOCK_COLLECTIONS.USERS,
                hint: `POST /api/mocks/seed?coleccion=${MOCK_COLLECTIONS.USERS}`,
              }),
              `/api/mocks/seed?coleccion=${MOCK_COLLECTIONS.ORDERS}`
            ),
          ],
          ...seedErrorExamples,
        }),
      },
    },
    delete: {
      tags: ['Mocks'],
      summary: 'Eliminar los datos de prueba',
      description: 'Borra solo los registros creados por el mocking (isMock: true). Deshabilitado con NODE_ENV=production.',
      responses: {
        200: success(
          'Registros eliminados',
          {
            type: 'object',
            properties: {
              status: { type: 'string' },
              eliminados: {
                type: 'object',
                properties: {
                  [MOCK_COLLECTIONS.USERS]: { type: 'integer' },
                  [MOCK_COLLECTIONS.ORDERS]: { type: 'integer' },
                  [MOCK_COLLECTIONS.DELIVERIES]: { type: 'integer' },
                },
              },
            },
          },
          { status: 'success', eliminados: { [MOCK_COLLECTIONS.USERS]: 13, [MOCK_COLLECTIONS.ORDERS]: 20, [MOCK_COLLECTIONS.DELIVERIES]: 20 } }
        ),
        ...errors('DELETE', '/api/mocks/seed', {
          403: [sample(new SeedForbiddenError()), internalDisabled('/api/mocks/seed')],
          500: [
            sample(new MockSeedError({ collection: 'todas', insertedBeforeError: 0, reason: 'connection lost' })),
          ],
        }),
      },
    },
  },
  '/api/mocks/seed/all': {
    post: {
      tags: ['Mocks'],
      summary: 'Insertar un dataset completo y relacionado',
      description:
        'Genera e inserta usuarios → pedidos → entregas, respetando las relaciones. **No lleva body: las cantidades van por query.** Si falla a mitad de camino, el error indica qué se llegó a insertar. Deshabilitado con NODE_ENV=production.',
      parameters: datasetParams,
      responses: {
        201: success(
          'Dataset insertado',
          { type: 'object', properties: { status: { type: 'string' }, insertados: ref('MockCounts') } },
          {
            status: 'success',
            insertados: {
              [MOCK_COLLECTIONS.USERS]: 10,
              [MOCK_COLLECTIONS.COURIERS]: 3,
              [MOCK_COLLECTIONS.ORDERS]: 20,
              [MOCK_COLLECTIONS.DELIVERIES]: 20,
            },
          }
        ),
        ...errors('POST', '/api/mocks/seed/all', {
          400: datasetErrors('/api/mocks/seed/all'),
          ...seedErrorExamples,
        }),
      },
    },
  },
};
