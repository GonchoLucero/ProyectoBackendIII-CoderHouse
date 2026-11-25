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

export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: Object.freeze([ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.CONFIRMED]: Object.freeze([ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.SHIPPED]: Object.freeze([ORDER_STATUS.DELIVERED]),
  [ORDER_STATUS.DELIVERED]: Object.freeze([]),
  [ORDER_STATUS.CANCELLED]: Object.freeze([]),
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
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
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

export const LOG_LEVELS = Object.freeze({
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
  http: 4,
  debug: 5,
});

export const LOG_COLORS = Object.freeze({
  fatal: 'bold white redBG',
  error: 'red',
  warning: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
});

export const LOG_FILES = Object.freeze({
  DIR: 'logs',
  ERROR_FILE: 'error.log',
  ERROR_MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ERROR_MAX_FILES: 5,
  ROTATING_PATTERN: 'app-%DATE%.log',
  ROTATING_MAX_SIZE: '20m',
  ROTATING_RETENTION: '14d',
});

export const UPLOAD_FIELDS = Object.freeze({
  USER_DOCUMENT: 'document',
  RECEIPT: 'receipt',
});

export const DOCUMENT_TYPES = Object.freeze({
  IDENTIFICATION: 'IDENTIFICATION',
  PROOF_OF_ADDRESS: 'PROOF_OF_ADDRESS',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
  VEHICLE_INSURANCE: 'VEHICLE_INSURANCE',
});

export const COURIER_ONLY_DOCUMENTS = Object.freeze([DOCUMENT_TYPES.DRIVER_LICENSE, DOCUMENT_TYPES.VEHICLE_INSURANCE]);

export const ORDER_RECEIPT_TYPES = Object.freeze({
  PAYMENT_RECEIPT: 'PAYMENT_RECEIPT',
  INVOICE: 'INVOICE',
});

export const DELIVERY_RECEIPT_TYPES = Object.freeze({
  DELIVERY_PROOF: 'DELIVERY_PROOF',
  SIGNED_RECEIPT: 'SIGNED_RECEIPT',
});

export const UPLOAD_FOLDERS = Object.freeze({
  TMP: 'tmp',
  USER_DOCUMENTS: 'users/documents',
  COURIER_LICENSES: 'users/licenses',
  ORDER_RECEIPTS: 'receipts/orders',
  DELIVERY_RECEIPTS: 'receipts/deliveries',
});

export const DOCUMENT_TYPE_FOLDERS = Object.freeze({
  [DOCUMENT_TYPES.IDENTIFICATION]: UPLOAD_FOLDERS.USER_DOCUMENTS,
  [DOCUMENT_TYPES.PROOF_OF_ADDRESS]: UPLOAD_FOLDERS.USER_DOCUMENTS,
  [DOCUMENT_TYPES.DRIVER_LICENSE]: UPLOAD_FOLDERS.COURIER_LICENSES,
  [DOCUMENT_TYPES.VEHICLE_INSURANCE]: UPLOAD_FOLDERS.COURIER_LICENSES,
});

export const ALLOWED_MIME_TYPES = Object.freeze({
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
});

export const UPLOAD_LIMITS = Object.freeze({
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_FILES: 1,
});

export const REQUEST_LIMITS = Object.freeze({
  JSON_BODY: '100kb',
});

export const TMP_UPLOAD_MAX_AGE_MS = 60 * 60 * 1000;
