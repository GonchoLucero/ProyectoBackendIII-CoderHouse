import {
  InvalidPaginationError,
  MissingFieldsError,
  ValidationError,
  NoFieldsToUpdateError,
  ProductNotFoundError,
  DuplicateProductCodeError,
} from '../../errors/index.js';
import { PAGINATION } from '../../constants/index.js';
import { ref, success, noContent, errors, sample, pathParam, queryParam, jsonBody } from '../helpers.js';
import { serverErrors, invalidJson } from './common.js';

const ID = '6650f0c2a1b2c3d4e5f60718';
const pid = pathParam('pid', 'Id del producto');
const productPayload = { type: 'object', properties: { status: { type: 'string' }, payload: ref('Product') } };

export const productsPaths = {
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'Listar productos',
      description: 'Por defecto solo devuelve productos con stock (status AVAILABLE).',
      parameters: [
        queryParam('category', 'Filtra por categoría', { type: 'string' }),
        queryParam('includeOutOfStock', 'Si es true, incluye productos sin stock', { type: 'boolean', default: false }),
        queryParam('limit', `Resultados por página (máx. ${PAGINATION.MAX_LIMIT})`, { type: 'integer', minimum: 1, default: PAGINATION.DEFAULT_LIMIT }),
        queryParam('page', 'Número de página', { type: 'integer', minimum: 1, default: 1 }),
      ],
      responses: {
        200: success('Listado de productos', {
          type: 'object',
          properties: {
            status: { type: 'string' },
            products: { type: 'array', items: ref('Product') },
            pagination: ref('Pagination'),
          },
        }),
        ...errors('GET', '/api/products', {
          400: [sample(new InvalidPaginationError('limit', '-1'), '/api/products?limit=-1')],
          ...serverErrors,
        }),
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Crear producto',
      requestBody: jsonBody(ref('ProductInput'), { title: 'Caja mediana', code: 'BOX-M', price: 1500, stock: 20 }),
      responses: {
        201: success('Producto creado', productPayload),
        ...errors('POST', '/api/products', {
          400: [
            sample(new MissingFieldsError(['code', 'price'])),
            sample(new ValidationError('El precio debe ser un número mayor o igual a 0', { field: 'price', value: -10 })),
            invalidJson,
          ],
          409: [sample(new DuplicateProductCodeError('BOX-M'))],
          ...serverErrors,
        }),
      },
    },
  },
  '/api/products/{pid}': {
    get: {
      tags: ['Products'],
      summary: 'Obtener producto por id',
      parameters: [pid],
      responses: {
        200: success('Producto encontrado', productPayload),
        ...errors('GET', `/api/products/${ID}`, { 404: [sample(new ProductNotFoundError(ID))], ...serverErrors }),
      },
    },
    put: {
      tags: ['Products'],
      summary: 'Actualizar producto',
      parameters: [pid],
      requestBody: jsonBody(ref('ProductUpdate'), { price: 1800, stock: 0 }),
      responses: {
        200: success('Producto actualizado', productPayload),
        ...errors('PUT', `/api/products/${ID}`, {
          400: [
            sample(new NoFieldsToUpdateError(['title', 'description', 'price', 'stock', 'category'])),
            sample(new ValidationError('El stock debe ser un entero mayor o igual a 0', { field: 'stock', value: -1 })),
            invalidJson,
          ],
          404: [sample(new ProductNotFoundError(ID))],
          ...serverErrors,
        }),
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Eliminar producto (borrado lógico)',
      parameters: [pid],
      responses: {
        204: noContent('Producto eliminado (sin contenido)'),
        ...errors('DELETE', `/api/products/${ID}`, { 404: [sample(new ProductNotFoundError(ID))], ...serverErrors }),
      },
    },
  },
};
