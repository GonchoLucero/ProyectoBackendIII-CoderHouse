import {
  InvalidRoleError,
  InvalidVehicleError,
  InvalidPaginationError,
  MissingFieldsError,
  InvalidEmailError,
  ValidationError,
  NoFieldsToUpdateError,
  UserNotFoundError,
  DuplicateEmailError,
} from '../../errors/index.js';
import { USER_ROLES, VEHICLE_TYPES, PAGINATION } from '../../constants/index.js';
import { ref, success, noContent, errors, sample, pathParam, queryParam, jsonBody } from '../helpers.js';
import { serverErrors, invalidJson } from './common.js';

const ID = '6650f0c2a1b2c3d4e5f60718';
const uid = pathParam('uid', 'Id del usuario');
const userPayload = { type: 'object', properties: { status: { type: 'string' }, payload: ref('User') } };

export const usersPaths = {
  '/api/users': {
    get: {
      tags: ['Users'],
      summary: 'Listar usuarios',
      description: 'Lista paginada de usuarios. Se puede filtrar por rol.',
      parameters: [
        queryParam('role', 'Filtra por rol', { type: 'string', enum: Object.values(USER_ROLES) }),
        queryParam('limit', `Resultados por página (máx. ${PAGINATION.MAX_LIMIT})`, { type: 'integer', minimum: 1, default: PAGINATION.DEFAULT_LIMIT }),
        queryParam('page', 'Número de página', { type: 'integer', minimum: 1, default: 1 }),
      ],
      responses: {
        200: success('Listado de usuarios', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            users: { type: 'array', items: ref('User') },
            pagination: ref('Pagination'),
          },
        }),
        ...errors('GET', '/api/users', {
          400: [
            sample(new InvalidRoleError('SUPERUSER', USER_ROLES), '/api/users?role=SUPERUSER'),
            sample(new InvalidPaginationError('limit', '-1'), '/api/users?limit=-1'),
          ],
          ...serverErrors,
        }),
      },
    },
    post: {
      tags: ['Users'],
      summary: 'Crear usuario',
      description: 'Crea un usuario. El password se guarda hasheado con bcrypt y nunca se devuelve.',
      requestBody: jsonBody(ref('UserInput'), {
        first_name: 'Ana',
        last_name: 'Pérez',
        email: 'ana.perez@test.com',
        password: 'coder123',
        role: USER_ROLES.USER,
      }),
      responses: {
        201: success('Usuario creado', userPayload),
        ...errors('POST', '/api/users', {
          400: [
            sample(new MissingFieldsError(['last_name', 'email', 'password'])),
            sample(new InvalidEmailError('ana@')),
            sample(new InvalidRoleError('SUPERUSER', USER_ROLES)),
            sample(new InvalidVehicleError('TRUCK', VEHICLE_TYPES)),
            sample(new ValidationError(`Solo los usuarios con rol ${USER_ROLES.COURIER} pueden tener vehículo`, { field: 'vehicle', role: USER_ROLES.USER })),
            invalidJson,
          ],
          409: [sample(new DuplicateEmailError('ana.perez@test.com'))],
          ...serverErrors,
        }),
      },
    },
  },
  '/api/users/{uid}': {
    get: {
      tags: ['Users'],
      summary: 'Obtener usuario por id',
      parameters: [uid],
      responses: {
        200: success('Usuario encontrado', userPayload),
        ...errors('GET', `/api/users/${ID}`, { 404: [sample(new UserNotFoundError(ID))], ...serverErrors }),
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Actualizar usuario',
      description: 'Actualiza solo los campos permitidos: first_name, last_name, age, phone, role, vehicle.',
      parameters: [uid],
      requestBody: jsonBody(ref('UserUpdate'), { role: USER_ROLES.COURIER, vehicle: VEHICLE_TYPES.MOTORCYCLE }),
      responses: {
        200: success('Usuario actualizado', userPayload),
        ...errors('PUT', `/api/users/${ID}`, {
          400: [
            sample(new NoFieldsToUpdateError(['first_name', 'last_name', 'age', 'phone', 'role', 'vehicle'])),
            sample(new InvalidRoleError('SUPERUSER', USER_ROLES)),
            sample(new InvalidVehicleError('TRUCK', VEHICLE_TYPES)),
            invalidJson,
          ],
          404: [sample(new UserNotFoundError(ID))],
          ...serverErrors,
        }),
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Eliminar usuario',
      parameters: [uid],
      responses: {
        204: noContent('Usuario eliminado (sin contenido)'),
        ...errors('DELETE', `/api/users/${ID}`, { 404: [sample(new UserNotFoundError(ID))], ...serverErrors }),
      },
    },
  },
};
