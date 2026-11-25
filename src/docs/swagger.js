import swaggerUi from 'swagger-ui-express';
import config from '../config/index.js';
import { schemas } from './components/schemas.js';
import { usersPaths } from './paths/users.docs.js';
import { productsPaths } from './paths/products.docs.js';
import { ordersPaths } from './paths/orders.docs.js';
import { deliveriesPaths } from './paths/deliveries.docs.js';
import { mocksPaths } from './paths/mocks.docs.js';
import { loggerPaths } from './paths/logger.docs.js';
import { uploadsPaths } from './paths/uploads.docs.js';

export const SWAGGER_PATHS = Object.freeze({
  UI: '/api/docs',
  JSON: '/api/docs.json',
});

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShipNow API',
    version: '1.0.0',
    description: [
      'API REST de **ShipNow** para gestionar usuarios, repartidores, productos, pedidos y entregas.',
      '',
      'Propósito: proyecto del curso Programación Backend III (Coderhouse). Incluye arquitectura por capas, un módulo de mocking para generar datos de prueba, manejo centralizado de errores y logging con Winston.',
      '',
      'Todas las respuestas de error tienen el formato `ErrorResponse`. La API no requiere autenticación.',
    ].join('\n'),
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Servidor local' }],
  tags: [
    { name: 'Users', description: 'Usuarios: clientes (USER), repartidores (COURIER) y administradores (ADMIN)' },
    { name: 'Orders', description: 'Pedidos de los clientes' },
    { name: 'Deliveries', description: 'Entregas asociadas a los pedidos y a sus repartidores' },
    { name: 'Mocks', description: 'Generación de datos simulados y carga controlada de datos de prueba' },
    { name: 'Logger', description: 'Herramienta interna para validar el sistema de logs' },
    { name: 'Products', description: 'Catálogo de productos' },
    { name: 'Uploads', description: 'Carga de documentos de usuarios y comprobantes de pedidos y entregas (multipart/form-data)' },
  ],
  paths: {
    ...usersPaths,
    ...ordersPaths,
    ...deliveriesPaths,
    ...mocksPaths,
    ...loggerPaths,
    ...productsPaths,
    ...uploadsPaths,
  },
  components: { schemas },
};

export const setupSwagger = (app) => {
  app.get(SWAGGER_PATHS.JSON, (req, res) => res.json(swaggerSpec));
  app.use(
    SWAGGER_PATHS.UI,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { customSiteTitle: 'ShipNow API - Docs' })
  );
};
