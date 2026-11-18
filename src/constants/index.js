export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  USER: 'USER', 
  COURIER: 'COURIER', 
});

export const PRODUCT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
});

export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const ORDER_PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const DELIVERY_STATUS = Object.freeze({
  PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT',
  ASSIGNED: 'ASSIGNED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const ORDER_TO_DELIVERY_STATUS = Object.freeze({
  [ORDER_STATUS.PENDING]: Object.freeze([DELIVERY_STATUS.PENDING_ASSIGNMENT]),
  [ORDER_STATUS.CONFIRMED]: Object.freeze([DELIVERY_STATUS.PENDING_ASSIGNMENT, DELIVERY_STATUS.ASSIGNED]),
  [ORDER_STATUS.SHIPPED]: Object.freeze([DELIVERY_STATUS.IN_TRANSIT]),
  [ORDER_STATUS.DELIVERED]: Object.freeze([DELIVERY_STATUS.DELIVERED]),
  [ORDER_STATUS.CANCELLED]: Object.freeze([DELIVERY_STATUS.CANCELLED]),
});

export const DELIVERY_STATUSES_WITH_COURIER = Object.freeze([
  DELIVERY_STATUS.ASSIGNED,
  DELIVERY_STATUS.IN_TRANSIT,
  DELIVERY_STATUS.DELIVERED,
]);

export const VEHICLE_TYPES = Object.freeze({
  BICYCLE: 'BICYCLE',
  MOTORCYCLE: 'MOTORCYCLE',
  CAR: 'CAR',
  VAN: 'VAN',
});

export const NODE_ENVS = Object.freeze({
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
});

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

export const RESPONSE_STATUS = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
});

export const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

export const MOCK_COLLECTIONS = Object.freeze({
  USERS: 'usuarios',
  COURIERS: 'repartidores',
  ORDERS: 'pedidos',
  DELIVERIES: 'entregas',
});

export const MOCK_LIMITS = Object.freeze({
  DEFAULT_QTY: 10,
  MAX_QTY: 500,
  MAX_ITEMS_PER_ORDER: 5,
  ADMIN_RATIO: 0.1, 
  COURIER_RATIO: 0.2, 
});

export const MOCK_DEFAULT_PASSWORD = 'coder123';
