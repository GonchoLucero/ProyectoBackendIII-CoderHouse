import { HTTP_STATUS, MOCK_LIMITS } from '../constants/index.js';

const define = (code, status, message) => Object.freeze({ code, status, message });

export const ERRORS = Object.freeze({
  VALIDATION_ERROR: define('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, 'Los datos enviados no son válidos'),
  MISSING_FIELDS: define('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, 'Faltan campos obligatorios'),
  NO_FIELDS_TO_UPDATE: define('NO_FIELDS_TO_UPDATE', HTTP_STATUS.BAD_REQUEST, 'No hay campos válidos para actualizar'),
  INVALID_ID: define('INVALID_ID', HTTP_STATUS.BAD_REQUEST, 'El id enviado no tiene un formato válido'),
  INVALID_JSON: define('INVALID_JSON', HTTP_STATUS.BAD_REQUEST, 'El body no es un JSON válido'),
  INVALID_PAGINATION: define('INVALID_PAGINATION', HTTP_STATUS.BAD_REQUEST, 'Parámetros de paginación inválidos'),

  INVALID_ROLE: define('INVALID_ROLE', HTTP_STATUS.BAD_REQUEST, 'Rol de usuario inválido'),
  INVALID_VEHICLE: define('INVALID_VEHICLE', HTTP_STATUS.BAD_REQUEST, 'Tipo de vehículo inválido'),
  INVALID_STATUS: define('INVALID_STATUS', HTTP_STATUS.BAD_REQUEST, 'Estado inválido'),
  INVALID_PRIORITY: define('INVALID_PRIORITY', HTTP_STATUS.BAD_REQUEST, 'Prioridad inválida'),
  INVALID_EMAIL: define('INVALID_EMAIL', HTTP_STATUS.BAD_REQUEST, 'El email no tiene un formato válido'),

  USER_NOT_FOUND: define('USER_NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Usuario no encontrado'),
  PRODUCT_NOT_FOUND: define('PRODUCT_NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Producto no encontrado'),
  ORDER_NOT_FOUND: define('ORDER_NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Pedido no encontrado'),
  DELIVERY_NOT_FOUND: define('DELIVERY_NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Entrega no encontrada'),
  ROUTE_NOT_FOUND: define('ROUTE_NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Ruta no encontrada'),

  DUPLICATE_EMAIL: define('DUPLICATE_EMAIL', HTTP_STATUS.CONFLICT, 'El email ya está registrado'),
  DUPLICATE_PRODUCT_CODE: define('DUPLICATE_PRODUCT_CODE', HTTP_STATUS.CONFLICT, 'Ya existe un producto con ese código'),
  INVALID_STATUS_TRANSITION: define('INVALID_STATUS_TRANSITION', HTTP_STATUS.CONFLICT, 'El cambio de estado no está permitido'),
  DUPLICATE_KEY: define('DUPLICATE_KEY', HTTP_STATUS.CONFLICT, 'Ya existe un registro con ese valor único'),

  MOCK_INVALID_QTY: define('MOCK_INVALID_QTY', HTTP_STATUS.BAD_REQUEST, 'La cantidad debe ser un número entero'),
  MOCK_NEGATIVE_QTY: define('MOCK_NEGATIVE_QTY', HTTP_STATUS.BAD_REQUEST, 'La cantidad no puede ser negativa'),
  MOCK_QTY_EXCEEDED: define('MOCK_QTY_EXCEEDED', HTTP_STATUS.BAD_REQUEST, `La cantidad máxima por request es ${MOCK_LIMITS.MAX_QTY}`),
  MOCK_EMPTY_REQUEST: define('MOCK_EMPTY_REQUEST', HTTP_STATUS.BAD_REQUEST, 'Hay que pedir al menos un registro'),
  MOCK_INVALID_COLLECTION: define('MOCK_INVALID_COLLECTION', HTTP_STATUS.BAD_REQUEST, 'Colección de mocks inválida'),
  MOCK_MISSING_DEPENDENCY: define('MOCK_MISSING_DEPENDENCY', HTTP_STATUS.BAD_REQUEST, 'Faltan datos previos para poder generar esta colección'),
  MOCK_GENERATION_FAILED: define('MOCK_GENERATION_FAILED', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'No se pudieron generar los datos de prueba'),
  MOCK_SEED_FAILED: define('MOCK_SEED_FAILED', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Falló la carga de datos de prueba en MongoDB'),
  SEED_FORBIDDEN: define('SEED_FORBIDDEN', HTTP_STATUS.FORBIDDEN, 'La carga de datos de prueba está deshabilitada en producción'),

  FILE_REQUIRED: define('FILE_REQUIRED', HTTP_STATUS.BAD_REQUEST, 'Hay que enviar un archivo'),
  UNEXPECTED_FILE_FIELD: define('UNEXPECTED_FILE_FIELD', HTTP_STATUS.BAD_REQUEST, 'El campo del archivo no es el esperado'),
  INVALID_DOCUMENT_TYPE: define('INVALID_DOCUMENT_TYPE', HTTP_STATUS.BAD_REQUEST, 'Tipo de documento inválido'),
  INVALID_FILE_TYPE: define('INVALID_FILE_TYPE', HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE, 'Tipo de archivo no permitido'),
  FILE_TOO_LARGE: define('FILE_TOO_LARGE', HTTP_STATUS.PAYLOAD_TOO_LARGE, 'El archivo supera el tamaño máximo permitido'),
  FILE_SAVE_FAILED: define('FILE_SAVE_FAILED', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'No se pudo guardar el archivo'),
  DATABASE_UNAVAILABLE: define('DATABASE_UNAVAILABLE', HTTP_STATUS.SERVICE_UNAVAILABLE, 'La base de datos no está disponible'),
  INTERNAL_ERROR: define('INTERNAL_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Error interno del servidor'),
});
