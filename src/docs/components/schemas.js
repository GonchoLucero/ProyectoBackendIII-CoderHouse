import {
  USER_ROLES,
  VEHICLE_TYPES,
  PRODUCT_STATUS,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  RESPONSE_STATUS,
  MOCK_COLLECTIONS,
  LOG_LEVELS,
} from '../../constants/index.js';
import { ERRORS } from '../../errors/index.js';
import { ref } from '../helpers.js';

const values = (obj) => Object.values(obj);
const objectId = { type: 'string', example: '6650f0c2a1b2c3d4e5f60718' };
const dateTime = { type: 'string', format: 'date-time', example: '2026-11-18T03:29:38.220Z' };

export const schemas = {
  ObjectId: objectId,

  SuccessResponse: {
    type: 'object',
    description: 'Formato base de toda respuesta exitosa. Los datos viajan en `payload` o en claves propias del endpoint.',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: [RESPONSE_STATUS.SUCCESS] },
    },
    additionalProperties: true,
  },

  ErrorResponse: {
    type: 'object',
    description: 'Formato único de error que devuelve el middleware global (errorHandler).',
    required: ['status', 'error', 'method', 'path', 'timestamp'],
    properties: {
      status: { type: 'string', enum: [RESPONSE_STATUS.ERROR] },
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', enum: Object.keys(ERRORS), example: ERRORS.MOCK_NEGATIVE_QTY.code },
          message: { type: 'string', example: '"qty" no puede ser negativo. Valor recibido: "-5"' },
          details: {
            description: 'Opcional. Datos extra del error (campo inválido, valores permitidos, etc.).',
            oneOf: [{ type: 'object', additionalProperties: true }, { type: 'array', items: { type: 'object' } }],
          },
        },
      },
      method: { type: 'string', example: 'GET' },
      path: { type: 'string', example: '/api/mocks/users?qty=-5' },
      timestamp: dateTime,
    },
  },

  Pagination: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 42 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      totalPages: { type: 'integer', example: 5 },
    },
  },

  User: {
    type: 'object',
    description: 'Usuario. Nunca se devuelve el password.',
    properties: {
      _id: objectId,
      first_name: { type: 'string', example: 'Ana' },
      last_name: { type: 'string', example: 'Pérez' },
      email: { type: 'string', format: 'email', example: 'ana.perez@test.com' },
      age: { type: 'integer', example: 29 },
      phone: { type: 'string', example: '341 555 1234' },
      role: { type: 'string', enum: values(USER_ROLES), example: USER_ROLES.USER },
      vehicle: {
        type: 'string',
        enum: values(VEHICLE_TYPES),
        description: 'Solo para usuarios con rol COURIER (repartidores).',
        example: VEHICLE_TYPES.MOTORCYCLE,
      },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },

  UserInput: {
    type: 'object',
    required: ['first_name', 'last_name', 'email', 'password'],
    properties: {
      first_name: { type: 'string', example: 'Ana' },
      last_name: { type: 'string', example: 'Pérez' },
      email: { type: 'string', format: 'email', example: 'ana.perez@test.com' },
      password: { type: 'string', format: 'password', example: 'coder123' },
      age: { type: 'integer', example: 29 },
      phone: { type: 'string', example: '341 555 1234' },
      role: { type: 'string', enum: values(USER_ROLES), default: USER_ROLES.USER },
      vehicle: {
        type: 'string',
        enum: values(VEHICLE_TYPES),
        description: 'Solo se permite si role es COURIER.',
      },
    },
  },

  UserUpdate: {
    type: 'object',
    description: 'Al menos uno de estos campos. El email y el password no se pueden modificar.',
    minProperties: 1,
    properties: {
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      age: { type: 'integer' },
      phone: { type: 'string' },
      role: { type: 'string', enum: values(USER_ROLES) },
      vehicle: { type: 'string', enum: values(VEHICLE_TYPES) },
    },
  },

  UserSummary: {
    type: 'object',
    description: 'Usuario resumido (populate).',
    properties: {
      _id: objectId,
      first_name: { type: 'string', example: 'Ana' },
      last_name: { type: 'string', example: 'Pérez' },
      email: { type: 'string', example: 'ana.perez@test.com' },
      role: { type: 'string', enum: values(USER_ROLES) },
    },
  },

  CourierSummary: {
    type: 'object',
    description: 'Repartidor resumido (populate).',
    properties: {
      _id: objectId,
      first_name: { type: 'string', example: 'Luis' },
      last_name: { type: 'string', example: 'Gómez' },
      phone: { type: 'string', example: '351 555 9876' },
      vehicle: { type: 'string', enum: values(VEHICLE_TYPES) },
      role: { type: 'string', enum: [USER_ROLES.COURIER] },
    },
  },

  Product: {
    type: 'object',
    properties: {
      _id: objectId,
      title: { type: 'string', example: 'Caja mediana' },
      description: { type: 'string', example: 'Caja de cartón 40x30x30' },
      code: { type: 'string', example: 'BOX-M' },
      price: { type: 'number', example: 1500 },
      stock: { type: 'integer', example: 20 },
      category: { type: 'string', example: 'general' },
      status: {
        type: 'string',
        enum: values(PRODUCT_STATUS),
        description: 'Se calcula según el stock: AVAILABLE si stock > 0, si no OUT_OF_STOCK.',
      },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },

  ProductInput: {
    type: 'object',
    required: ['title', 'code', 'price'],
    properties: {
      title: { type: 'string', example: 'Caja mediana' },
      code: { type: 'string', example: 'BOX-M' },
      price: { type: 'number', minimum: 0, example: 1500 },
      stock: { type: 'integer', minimum: 0, default: 0, example: 20 },
      description: { type: 'string', example: 'Caja de cartón 40x30x30' },
      category: { type: 'string', example: 'general' },
    },
  },

  ProductUpdate: {
    type: 'object',
    minProperties: 1,
    description: 'Al menos uno de estos campos. El code no se puede modificar.',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      stock: { type: 'integer', minimum: 0 },
      category: { type: 'string' },
    },
  },

  OrderItem: {
    type: 'object',
    required: ['title', 'quantity', 'unitPrice'],
    properties: {
      title: { type: 'string', example: 'Caja mediana' },
      quantity: { type: 'integer', minimum: 1, example: 2 },
      unitPrice: { type: 'number', minimum: 0, example: 1500 },
    },
  },

  ShippingAddress: {
    type: 'object',
    required: ['street', 'city', 'province', 'zipCode'],
    properties: {
      street: { type: 'string', example: 'San Martín 123' },
      city: { type: 'string', example: 'Rosario' },
      province: { type: 'string', example: 'Santa Fe' },
      zipCode: { type: 'string', example: '2000' },
    },
  },

  Order: {
    type: 'object',
    properties: {
      _id: objectId,
      code: { type: 'string', example: 'ORD-1A2B3C4D' },
      user: {
        description: 'Id del cliente. En los GET viene populado con sus datos.',
        oneOf: [ref('ObjectId'), ref('UserSummary')],
      },
      items: { type: 'array', items: ref('OrderItem') },
      total: { type: 'number', description: 'Suma de quantity × unitPrice.', example: 3000 },
      status: { type: 'string', enum: values(ORDER_STATUS), example: ORDER_STATUS.PENDING },
      priority: { type: 'string', enum: values(ORDER_PRIORITY), example: ORDER_PRIORITY.NORMAL },
      shippingAddress: ref('ShippingAddress'),
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },

  OrderInput: {
    type: 'object',
    required: ['user', 'items', 'shippingAddress'],
    properties: {
      user: { ...objectId, description: 'Id de un usuario existente con rol USER.' },
      items: { type: 'array', minItems: 1, items: ref('OrderItem') },
      priority: { type: 'string', enum: values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL },
      shippingAddress: ref('ShippingAddress'),
    },
  },

  Delivery: {
    type: 'object',
    properties: {
      _id: objectId,
      trackingCode: { type: 'string', example: 'SN-A1B2C3D4E5' },
      order: {
        description: 'Id del pedido. En los GET viene populado (code, status, priority, total, user).',
        oneOf: [ref('ObjectId'), { type: 'object', additionalProperties: true }],
      },
      courier: {
        description: 'Repartidor asignado (populado en los GET) o null si todavía no tiene.',
        nullable: true,
        oneOf: [ref('ObjectId'), ref('CourierSummary')],
      },
      status: { type: 'string', enum: values(DELIVERY_STATUS), example: DELIVERY_STATUS.PENDING_ASSIGNMENT },
      estimatedDeliveryDate: dateTime,
      deliveredAt: { ...dateTime, nullable: true },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },

  MockUser: {
    allOf: [
      ref('User'),
      { type: 'object', description: 'Usuario simulado: incluye un _id generado, sin timestamps ni password.' },
    ],
  },

  MockOrder: {
    allOf: [ref('Order'), { type: 'object', description: 'Pedido simulado: `user` es el _id de un cliente generado.' }],
  },

  MockDelivery: {
    allOf: [ref('Delivery'), { type: 'object', description: 'Entrega simulada coherente con el estado del pedido.' }],
  },

  MockCounts: {
    type: 'object',
    properties: {
      [MOCK_COLLECTIONS.USERS]: { type: 'integer', example: 10 },
      [MOCK_COLLECTIONS.COURIERS]: { type: 'integer', example: 3 },
      [MOCK_COLLECTIONS.ORDERS]: { type: 'integer', example: 20 },
      [MOCK_COLLECTIONS.DELIVERIES]: { type: 'integer', example: 20 },
    },
  },

  LogLevel: { type: 'string', enum: Object.keys(LOG_LEVELS) },
};
