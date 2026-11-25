import AppError from './AppError.js';
import { ERRORS } from './errorDictionary.js';

const list = (values) => Object.values(values).join(', ');

export class ValidationError extends AppError {
  constructor(message, details) {
    super(ERRORS.VALIDATION_ERROR, { message, details });
  }
}

export class MissingFieldsError extends AppError {
  constructor(fields) {
    super(ERRORS.MISSING_FIELDS, {
      message: `Faltan campos obligatorios: ${fields.join(', ')}`,
      details: { fields },
    });
  }
}

export class NoFieldsToUpdateError extends AppError {
  constructor(allowedFields) {
    super(ERRORS.NO_FIELDS_TO_UPDATE, {
      message: `No hay campos válidos para actualizar. Permitidos: ${allowedFields.join(', ')}`,
      details: { allowedFields },
    });
  }
}

export class InvalidPaginationError extends AppError {
  constructor(param, value) {
    super(ERRORS.INVALID_PAGINATION, {
      message: `"${param}" debe ser un entero mayor a 0. Valor recibido: "${value}"`,
      details: { param, value },
    });
  }
}

export class InvalidEmailError extends AppError {
  constructor(email) {
    super(ERRORS.INVALID_EMAIL, { details: { email } });
  }
}

class InvalidValueError extends AppError {
  constructor(definition, label, value, allowed) {
    super(definition, {
      message: `${label} inválido: "${value}". Opciones: ${list(allowed)}`,
      details: { value, allowed: Object.values(allowed) },
    });
  }
}

export class InvalidRoleError extends InvalidValueError {
  constructor(value, allowed) {
    super(ERRORS.INVALID_ROLE, 'Rol', value, allowed);
  }
}

export class InvalidVehicleError extends InvalidValueError {
  constructor(value, allowed) {
    super(ERRORS.INVALID_VEHICLE, 'Vehículo', value, allowed);
  }
}

export class InvalidStatusError extends InvalidValueError {
  constructor(value, allowed) {
    super(ERRORS.INVALID_STATUS, 'Estado', value, allowed);
  }
}

export class InvalidPriorityError extends InvalidValueError {
  constructor(value, allowed) {
    super(ERRORS.INVALID_PRIORITY, 'Prioridad', value, allowed);
  }
}

export class UserNotFoundError extends AppError {
  constructor(id) {
    super(ERRORS.USER_NOT_FOUND, { message: `Usuario ${id} no encontrado`, details: { id } });
  }
}

export class ProductNotFoundError extends AppError {
  constructor(id) {
    super(ERRORS.PRODUCT_NOT_FOUND, { message: `Producto ${id} no encontrado`, details: { id } });
  }
}

export class OrderNotFoundError extends AppError {
  constructor(id) {
    super(ERRORS.ORDER_NOT_FOUND, { message: `Pedido ${id} no encontrado`, details: { id } });
  }
}

export class DeliveryNotFoundError extends AppError {
  constructor(id) {
    super(ERRORS.DELIVERY_NOT_FOUND, { message: `Entrega ${id} no encontrada`, details: { id } });
  }
}

export class RouteNotFoundError extends AppError {
  constructor(method, path) {
    super(ERRORS.ROUTE_NOT_FOUND, { message: `Ruta ${method} ${path} no encontrada` });
  }
}

export class DuplicateEmailError extends AppError {
  constructor(email) {
    super(ERRORS.DUPLICATE_EMAIL, { message: `El email ${email} ya está registrado`, details: { email } });
  }
}

export class DuplicateProductCodeError extends AppError {
  constructor(code) {
    super(ERRORS.DUPLICATE_PRODUCT_CODE, {
      message: `Ya existe un producto con el código "${code}"`,
      details: { code },
    });
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from, to, allowed) {
    super(ERRORS.INVALID_STATUS_TRANSITION, {
      message: allowed.length
        ? `No se puede pasar un pedido de ${from} a ${to}. Estados posibles: ${allowed.join(', ')}`
        : `No se puede pasar un pedido de ${from} a ${to}: ${from} es un estado final`,
      details: { from, to, allowed },
    });
  }
}

export class InvalidMockQuantityError extends AppError {
  constructor(param, value, reason = 'debe ser un número entero mayor a 0') {
    super(ERRORS.MOCK_INVALID_QTY, {
      message: `"${param}" ${reason}. Valor recibido: "${value}"`,
      details: { param, value },
    });
  }
}

export class NegativeMockQuantityError extends AppError {
  constructor(param, value) {
    super(ERRORS.MOCK_NEGATIVE_QTY, {
      message: `"${param}" no puede ser negativo. Valor recibido: "${value}"`,
      details: { param, value },
    });
  }
}

export class MockQuantityExceededError extends AppError {
  constructor(param, value, max) {
    super(ERRORS.MOCK_QTY_EXCEEDED, {
      message: `"${param}" supera el máximo permitido (${max}). Valor recibido: "${value}"`,
      details: { param, value, max },
    });
  }
}

export class EmptyMockRequestError extends AppError {
  constructor(params) {
    super(ERRORS.MOCK_EMPTY_REQUEST, {
      message: `Al menos uno de estos parámetros tiene que ser mayor a 0: ${params.join(', ')}`,
      details: { params },
    });
  }
}

export class InvalidMockCollectionError extends AppError {
  constructor(value, allowed) {
    super(ERRORS.MOCK_INVALID_COLLECTION, {
      message: `Colección inválida: "${value}". Opciones: ${list(allowed)}`,
      details: { value, allowed: Object.values(allowed) },
    });
  }
}

export class MockDependencyError extends AppError {
  constructor(message, { required, hint } = {}) {
    super(ERRORS.MOCK_MISSING_DEPENDENCY, { message, details: { required, hint } });
  }
}

export class MockGenerationError extends AppError {
  constructor(message, cause) {
    super(ERRORS.MOCK_GENERATION_FAILED, { message, cause });
  }
}

export class MockSeedError extends AppError {
  constructor({ collection, insertedBeforeError, reason, cause }) {
    super(ERRORS.MOCK_SEED_FAILED, {
      message: `Falló la carga de "${collection}" en MongoDB`,
      details: { coleccion: collection, insertadosAntesDelError: insertedBeforeError, motivo: reason },
      cause,
    });
  }
}

export class SeedForbiddenError extends AppError {
  constructor() {
    super(ERRORS.SEED_FORBIDDEN);
  }
}

export class FileRequiredError extends AppError {
  constructor(field) {
    super(ERRORS.FILE_REQUIRED, {
      message: `Hay que enviar un archivo en el campo "${field}" (multipart/form-data)`,
      details: { field },
    });
  }
}

export class UnexpectedFileFieldError extends AppError {
  constructor(received, expected) {
    super(ERRORS.UNEXPECTED_FILE_FIELD, {
      message: `El archivo tiene que enviarse en el campo "${expected}"${received ? ` (se recibió "${received}")` : ''}`,
      details: { received, expected },
    });
  }
}

export class InvalidDocumentTypeError extends AppError {
  constructor(value, allowed, message) {
    const allowedList = Array.isArray(allowed) ? allowed : Object.values(allowed);
    super(ERRORS.INVALID_DOCUMENT_TYPE, {
      message: message ?? `Tipo de documento inválido: "${value}". Opciones: ${allowedList.join(', ')}`,
      details: { value, allowed: allowedList },
    });
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(mimetype, allowed) {
    super(ERRORS.INVALID_FILE_TYPE, {
      message: `Tipo de archivo no permitido: "${mimetype}". Permitidos: ${allowed.join(', ')}`,
      details: { mimetype, allowed },
    });
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxBytes) {
    super(ERRORS.FILE_TOO_LARGE, {
      message: `El archivo supera el tamaño máximo de ${maxBytes / (1024 * 1024)} MB`,
      details: { maxBytes },
    });
  }
}

export class FileSaveError extends AppError {
  constructor(reason, cause) {
    super(ERRORS.FILE_SAVE_FAILED, { details: { motivo: reason }, cause });
  }
}

export class InternalEndpointDisabledError extends AppError {
  constructor(path) {
    super(ERRORS.INTERNAL_ENDPOINT_DISABLED, {
      message: `El endpoint interno ${path} está deshabilitado en este entorno (ENABLE_INTERNAL_ENDPOINTS=false)`,
      details: { path },
    });
  }
}
