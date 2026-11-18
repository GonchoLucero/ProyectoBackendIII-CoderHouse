import { RESPONSE_STATUS } from '../constants/index.js';

const EXAMPLE_TIMESTAMP = '2026-11-18T03:29:38.220Z';

const json = (schema, extra = {}) => ({ 'application/json': { schema, ...extra } });

export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

export const success = (description, schema, example) => ({
  description,
  content: json(schema, example ? { example } : {}),
});

export const noContent = (description) => ({ description });

const errorExample = (error, method, path) => ({
  status: RESPONSE_STATUS.ERROR,
  error: {
    code: error.code,
    message: error.message,
    ...(error.details !== undefined && { details: error.details }),
  },
  method,
  path,
  timestamp: EXAMPLE_TIMESTAMP,
});

export const errors = (method, path, byStatus) =>
  Object.fromEntries(
    Object.entries(byStatus).map(([status, list]) => [
      status,
      {
        description: list.map(({ error }) => error.code).join(' | '),
        content: json(ref('ErrorResponse'), {
          examples: Object.fromEntries(
            list.map(({ error, path: examplePath }) => [
              error.code,
              { summary: error.message, value: errorExample(error, method, examplePath ?? path) },
            ])
          ),
        }),
      },
    ])
  );

export const sample = (error, path) => ({ error, path });

export const pathParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', example: '6650f0c2a1b2c3d4e5f60718' },
});

export const queryParam = (name, description, schema) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
});

export const jsonBody = (schema, example, description) => ({
  required: true,
  ...(description && { description }),
  content: json(schema, example ? { example } : {}),
});
