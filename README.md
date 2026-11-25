# ShipNow API

## Cómo correr el proyecto localmente

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone https://github.com/GonchoLucero/ProyectoBackendIII-CoderHouse.git
   cd ProyectoBackendIII-CoderHouse
   npm install
   ```

2. Crear el archivo `.env` a partir del ejemplo y completar los valores:

   ```bash
   cp .env.example .env
   ```

   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/shipnow
   NODE_ENV=development
   ```

3. Levantar el servidor:

   ```bash
   npm run dev
   npm start
   ```

4. Probar: `GET http://localhost:8080/health` → `{ "status": "success" }`

Si falta alguna variable obligatoria (por ejemplo `MONGODB_URI`), la app no arranca y muestra un error indicando cuál falta.

---

## Módulo de mocking (`/api/mocks`)

Genera **usuarios, repartidores, pedidos y entregas** de prueba con [`@faker-js/faker`](https://fakerjs.dev/) (nombres en español y direcciones de provincias argentinas). Tiene dos modos:

| Modo | Métodos | ¿Guarda en MongoDB? |
|---|---|---|
| Simulación | `GET /api/mocks/...` | **No.** Solo devuelve los datos |
| Carga controlada | `POST` / `DELETE /api/mocks/seed...` | **Sí.** Inserta o borra registros de prueba |

### Endpoints que devuelven datos simulados

| Método | Ruta | Query | Devuelve |
|---|---|---|---|
| GET | `/api/mocks/users` | `qty` | Usuarios con roles mezclados (~70% `USER`, ~20% `COURIER`, ~10% `ADMIN`) |
| GET | `/api/mocks/couriers` | `qty` | Repartidores: rol `COURIER` + vehículo |
| GET | `/api/mocks/orders` | `qty` | Pedidos + en `related.users` los clientes a los que pertenecen |
| GET | `/api/mocks/deliveries` | `qty` | Entregas + en `related` sus pedidos, repartidores y clientes |
| GET | `/api/mocks/dataset` | `users`, `couriers`, `orders` | Un conjunto completo y relacionado de las 4 entidades |

`qty` es un entero entre **1 y 500** (por defecto **10**). Si es inválido se responde `400`.

Ejemplo: `GET /api/mocks/users?qty=2`

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "d89efedbc3ee3a51c57a4d27",
      "first_name": "Nicole",
      "last_name": "Villegas Maya",
      "email": "nicole.villegasmaya.jmfn@test.com",
      "age": 29,
      "phone": "511 113 2538",
      "role": "USER"
    },
    {
      "_id": "6f3aae7fd5cfd5dc5ae41330",
      "first_name": "Sancho",
      "last_name": "Serrato Camarillo",
      "email": "sancho.serratocamarillo.cy3j@test.com",
      "age": 55,
      "phone": "558 900 755",
      "role": "COURIER",
      "vehicle": "BICYCLE"
    }
  ]
}
```

### Endpoints de carga controlada en MongoDB

| Método | Ruta | Query | Qué hace |
|---|---|---|---|
| POST | `/api/mocks/seed` | `qty`, `coleccion` | Inserta `qty` registros de **una** colección |
| POST | `/api/mocks/seed/all` | `users`, `couriers`, `orders` | Inserta un dataset completo y relacionado (usuarios → pedidos → entregas) |
| DELETE | `/api/mocks/seed` | — | Borra **solo** los registros creados por el mocking |

Valores de `coleccion`: `usuarios` (por defecto), `repartidores`, `pedidos`, `entregas`.

Ejemplo: `POST /api/mocks/seed?qty=10`

```json
{ "status": "success", "insertados": 10, "coleccion": "usuarios" }
```

Ejemplo: `POST /api/mocks/seed/all?users=10&couriers=3&orders=20`

```json
{
  "status": "success",
  "insertados": { "usuarios": 10, "repartidores": 3, "pedidos": 20, "entregas": 20 }
}
```

### Qué datos se generan y cómo se relacionan

| Entidad | Campos principales | Valores permitidos (constantes) |
|---|---|---|
| Usuario | `first_name`, `last_name`, `email`, `age`, `phone`, `role` | `USER_ROLES`: `ADMIN`, `USER`, `COURIER` |
| Repartidor | Usuario con `role: COURIER` + `vehicle` | `VEHICLE_TYPES`: `BICYCLE`, `MOTORCYCLE`, `CAR`, `VAN` |
| Pedido | `code`, `user`, `items[]`, `total`, `status`, `priority`, `shippingAddress` | `ORDER_STATUS`: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED` · `ORDER_PRIORITY`: `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| Entrega | `trackingCode`, `order`, `courier`, `status`, `estimatedDeliveryDate`, `deliveredAt` | `DELIVERY_STATUS`: `PENDING_ASSIGNMENT`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` |


## Manejo de errores

Todos los errores de la API pasan por una **capa centralizada**:

| Pieza | Archivo | Rol |
|---|---|---|
| Diccionario de errores | `src/errors/errorDictionary.js` | Cada error tiene un `code` estable, un status HTTP y un mensaje por defecto |
| Error base | `src/errors/AppError.js` | Clase base: toma `code` y `status` del diccionario |
| Errores de dominio | `src/errors/domain.errors.js` | `UserNotFoundError`, `OrderNotFoundError`, `InvalidStatusError`, `InvalidMockQuantityError`, `MockSeedError`, etc. |
| Middleware global | `src/middlewares/errorHandler.js` | **Único lugar que responde errores.** También traduce errores de Mongoose, de MongoDB y de Express |

Los errores se **detectan** en la capa que corresponde (sobre todo en los services) y se lanzan con `throw`. Ni las rutas ni los controllers responden errores: Express 5 deriva automáticamente al middleware los errores de funciones `async`. Las rutas inexistentes también pasan por el middleware.

### Estructura de la respuesta de error

Todas las respuestas de error tienen la misma forma:

```json
{
  "status": "error",
  "error": {
    "code": "MOCK_NEGATIVE_QTY",
    "message": "\"qty\" no puede ser negativo. Valor recibido: \"-5\"",
    "details": { "param": "qty", "value": "-5" }
  },
  "method": "GET",
  "path": "/api/mocks/users?qty=-5",
  "timestamp": "2026-11-18T03:29:38.220Z"
}
```

| Campo | Descripción |
|---|---|
| `status` | Siempre `"error"` |
| `error.code` | Código del diccionario. Es estable, así que el cliente puede programar en base a él |
| `error.message` | Mensaje legible en español |
| `error.details` | Opcional: datos extra (campo inválido, valores permitidos, qué se insertó antes de una falla…) |
| `method`, `path`, `timestamp` | Contexto del request |

En `NODE_ENV=production`, los errores 5xx no exponen detalles internos: se devuelve el mensaje genérico del diccionario.

### Códigos de error

| Código | HTTP | Cuándo ocurre |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Datos con formato o valor inválido (precio negativo, validación de Mongoose…) |
| `MISSING_FIELDS` | 400 | Faltan campos obligatorios (`details.fields` dice cuáles) |
| `NO_FIELDS_TO_UPDATE` | 400 | `PUT` sin ningún campo actualizable |
| `INVALID_ID` | 400 | Id con formato inválido |
| `INVALID_JSON` | 400 | Body mal formado |
| `INVALID_PAGINATION` | 400 | `limit` o `page` no son enteros positivos |
| `INVALID_ROLE` / `INVALID_VEHICLE` / `INVALID_STATUS` / `INVALID_PRIORITY` | 400 | Valor fuera de las constantes (`details.allowed` lista los válidos) |
| `INVALID_EMAIL` | 400 | Email con formato inválido |
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` / `DELIVERY_NOT_FOUND` | 404 | El recurso no existe |
| `ROUTE_NOT_FOUND` | 404 | La ruta no existe |
| `DUPLICATE_EMAIL` / `DUPLICATE_PRODUCT_CODE` / `DUPLICATE_KEY` | 409 | Ya existe un registro con ese valor único |
| `MOCK_INVALID_QTY` | 400 | La cantidad no es un entero, es 0 o se envió repetida |
| `MOCK_NEGATIVE_QTY` | 400 | La cantidad es negativa |
| `MOCK_QTY_EXCEEDED` | 400 | La cantidad supera el máximo (500) |
| `MOCK_EMPTY_REQUEST` | 400 | En `/dataset` o `/seed/all` todas las cantidades son 0 |
| `MOCK_INVALID_COLLECTION` | 400 | `coleccion` no es `usuarios`, `repartidores`, `pedidos` ni `entregas` |
| `MOCK_MISSING_DEPENDENCY` | 400 | Faltan datos previos (pedidos sin clientes, entregas sin repartidores…). `details.hint` dice qué cargar |
| `SEED_FORBIDDEN` | 403 | Carga de mocks en producción |
| `MOCK_GENERATION_FAILED` | 500 | Falló la generación de datos falsos |
| `MOCK_SEED_FAILED` | 500 | Falló la inserción en MongoDB (`details` trae la colección, el motivo y lo insertado antes del error) |
| `DATABASE_UNAVAILABLE` | 503 | No hay conexión con MongoDB |
| `INTERNAL_ERROR` | 500 | Cualquier error inesperado |


## Logging y monitoreo (Winston)

Los mensajes sueltos de `console.log()` se reemplazaron por un **logger centralizado** con [Winston](https://github.com/winstonjs/winston) y [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file). Se configura una sola vez en `src/config/logger.js` y se usa desde cualquier archivo con `import logger from '../config/logger.js'`.

### Niveles de log

| Nivel | Prioridad | Para qué se usa |
|---|---|---|
| `fatal` | 0 | Fallas críticas: configuración inválida, no se pudo conectar a MongoDB al arrancar, excepciones no capturadas |
| `error` | 1 | Errores inesperados del servidor (5xx), fallas al cargar mocks, falla al crear un pedido |
| `warning` | 2 | Errores esperados o de negocio (4xx): pedido no encontrado, cantidad inválida de mocks, ruta inexistente, pedido sin repartidor |
| `info` | 3 | Eventos importantes: servidor iniciado, conexión a MongoDB, pedido creado, mocks generados o insertados |
| `http` | 4 | Cada request: método, ruta, status y duración |
| `debug` | 5 | Detalle interno para depurar |

Formato de cada línea (consola y archivos): `timestamp [nivel] mensaje`

```
2026-11-18 00:48:29 [info]    Servidor ShipNow escuchando en el puerto 8080 (development)
2026-11-18 00:48:29 [info]    Conexión a MongoDB establecida
2026-11-18 00:48:31 [warning] Pedido ORD-1A2B3C4D sin repartidor asignado
2026-11-18 00:48:35 [warning] [MOCK_NEGATIVE_QTY] "qty" no puede ser negativo. Valor recibido: "-5" - GET /api/mocks/users?qty=-5
2026-11-18 00:48:40 [error]   Falló la creación del pedido: ValidationError (...)
```

### Comportamiento según el entorno (`NODE_ENV`)

| `NODE_ENV` | Nivel mínimo | Consola | Archivos |
|---|---|---|---|
| `development` | `debug` (todo) | Sí, con colores | Sí |
| `production` | `info` (no muestra `http` ni `debug`) | Sí, sin colores | Sí |
| `test` | — | Silenciada | No se generan |

### Integración con el manejo de errores

El middleware global (`src/middlewares/errorHandler.js`) registra cada error antes de responder:

- **4xx** (errores de negocio) → `warning`
- **5xx** (errores inesperados, base caída, falla de carga de mocks) → `error`, con el stack
- Las fallas al iniciar (variables de entorno faltantes, MongoDB inaccesible) y las excepciones no capturadas → `fatal` (en `src/server.js`)

La respuesta al cliente es la misma que en la Pre-entrega 3: el logger complementa al manejo de errores, no lo reemplaza.

### Archivos de logs y rotación

| Archivo | Contenido | Rotación |
|---|---|---|
| `logs/error.log` | **Solo `error` y `fatal`** | Por tamaño: 5 MB por archivo, conserva los últimos 5 |
| `logs/app-YYYY-MM-DD.log` | Todos los niveles activos según el entorno | Uno por día (o cada 20 MB), comprimidos, se conservan 14 días |

**Git:** los archivos generados no se suben. En `.gitignore` está `logs/*` (y `*.log`). Solo se versiona `logs/.gitkeep` para que la carpeta quede documentada en el repo.

### Endpoint de prueba del logger

`GET /api/logger/test` genera un log de **cada nivel** (`debug`, `http`, `info`, `warning`, `error`, `fatal`). Es una herramienta interna para verificar la configuración, no una funcionalidad del negocio.

```bash
curl http://localhost:8080/api/logger/test
```

Responde qué niveles se muestran en el entorno actual y cuáles se guardan en `error.log`:

```json
{
  "status": "success",
  "message": "Se generó un log de cada nivel",
  "nivelActivo": "debug",
  "niveles": [
    { "nivel": "debug", "mensaje": "Prueba de log DEBUG: ...", "seMuestra": true, "seGuardaEnErrorLog": false },
    { "nivel": "fatal", "mensaje": "Prueba de log FATAL: ...", "seMuestra": true, "seGuardaEnErrorLog": true }
  ],
  "archivos": { "errores": "logs/error.log", "rotados": "logs/app-%DATE%.log" }
}
```

Para verificar: mirá la consola (aparecen los 6 niveles en desarrollo), abrí `logs/error.log` (solo `error` y `fatal`) y `logs/app-<fecha>.log` (todos).

### Creación de pedidos

Para registrar la operación de negocio más importante se agregó `POST /api/orders`. Crea el pedido en estado `PENDING` y su entrega en `PENDING_ASSIGNMENT`. Loguea un `info` con el pedido creado y un `warning` porque queda sin repartidor asignado.

```bash
curl -X POST http://localhost:8080/api/orders -H "Content-Type: application/json" -d '{
  "user": "<_id de un usuario con rol USER>",
  "items": [{ "title": "Caja mediana", "quantity": 2, "unitPrice": 1500 }],
  "priority": "HIGH",
  "shippingAddress": { "street": "San Martín 123", "city": "Rosario", "province": "Santa Fe", "zipCode": "2000" }
}'
```

## Documentación de la API (Swagger)

### Qué está documentado

| Tag | Endpoints |
|---|---|
| **Users** | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{uid}` |
| **Orders** | `GET/POST /api/orders`, `GET /api/orders/{oid}` |
| **Deliveries** | `GET /api/deliveries`, `GET /api/deliveries/{did}` |
| **Mocks** | `GET /api/mocks/users`, `/couriers`, `/orders`, `/deliveries`, `/dataset` · `POST /api/mocks/seed`, `POST /api/mocks/seed/all` · `DELETE /api/mocks/seed` |
| **Logger** | `GET /api/logger/test`: herramienta de validación, no una funcionalidad del negocio |
| **Products** | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{pid}` |

Cada endpoint indica método, ruta, descripción, parámetros de ruta y query, body esperado, respuesta exitosa y los errores posibles, con un ejemplo real de cada uno.

**Schemas reutilizables** (`components/schemas`): `User`, `UserInput`, `UserUpdate`, `Product`, `ProductInput`, `ProductUpdate`, `Order`, `OrderInput`, `OrderItem`, `ShippingAddress`, `Delivery`, `Pagination`, `SuccessResponse`, `ErrorResponse`, `MockUser`, `MockOrder`, `MockDelivery`, `MockCounts`, `LogLevel`.

## Testing (Mocha, Chai y Supertest)

### Herramientas

| Herramienta | Para qué |
|---|---|
| [Mocha](https://mochajs.org/) | Organiza y ejecuta los tests (`describe`, `it`, hooks `before`/`beforeEach`/`after`) |
| [Chai](https://www.chaijs.com/) | Valida los resultados (`expect(...).to...`) |
| [Supertest](https://github.com/ladjs/supertest) | Hace las peticiones HTTP contra la app de Express **sin levantar el servidor** |
| [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server) | Levanta una base MongoDB temporal y descartable solo para los tests |

La app de Express está separada del arranque: `src/app.js` exporta la app y `src/server.js` es el único que conecta a MongoDB y abre el puerto. Los tests importan `app.js` directamente.

### Cómo ejecutarlos

```bash
npm install
npm test                  
npm run test:functional   
npm run test:unit        
```

La suite se puede correr las veces que quieras seguidas: cada grupo limpia los datos que genera.


### Datos de prueba y limpieza

- Los datos son controlados y descartables: cada test crea lo que necesita a través de la API, con los helpers de `tests/helpers/factories.js` (por ejemplo, crea un cliente válido antes de crear un pedido), o con los endpoints de mocks.
- **Limpieza:** cada archivo funcional vacía las colecciones en `beforeEach` y en `after` (`tests/helpers/db.js`). Al terminar la suite se borra la base de testing completa y se apaga la base en memoria (`tests/setup.js`). Los tests no dependen del orden ni de datos previos.

### Organización

```
tests/
├── setup.js                
├── helpers/
│   ├── db.js                
│   ├── factories.js         
│   └── assertions.js        
├── functional/              
│   ├── users.test.js
│   ├── orders.test.js
│   ├── deliveries.test.js
│   ├── mocks.test.js
│   ├── logger.test.js
│   ├── swagger.test.js
│   └── errors.test.js
└── unit/                    
```

### Módulos cubiertos

| Módulo | Casos exitosos | Casos de error |
|---|---|---|
| **Users** | listar (vacío, con datos, filtro por rol, paginación), obtener por id, crear | rol inválido, paginación inválida, usuario inexistente (404), datos incompletos, email duplicado, email inválido |
| **Orders** | crear pedido válido (con su entrega), listar con cliente populado, filtrar por estado y prioridad, obtener por id | datos incompletos, dirección incompleta, ítem inválido, prioridad inválida, usuario inexistente, usuario que no es cliente, estado inválido, pedido inexistente (404) |
| **Estados** (`PATCH /api/orders/{oid}/status`) | confirmar con repartidor, ciclo completo hasta `DELIVERED`, cancelar | estado inválido, estado faltante, transición no permitida (409), despachar sin repartidor, repartidor inválido, pedido inexistente |
| **Deliveries** | listar con pedido populado, filtrar por estado, obtener por id | estado inválido, entrega inexistente (404) |
| **Mocks** | generar users, couriers, orders, deliveries y dataset; insertar con `seed` paso a paso y con `seed/all`; borrar solo los mocks | `qty` no numérica, 0, decimal, negativa o mayor a 500; dataset vacío; dependencias faltantes; colección inválida |
| **Logger** | `GET /api/logger/test` con los 6 niveles | método no soportado |
| **Swagger** | `/api/docs` (redirección y UI) y `/api/docs.json` | cada 404 documentado de un recurso por id se comprueba contra la API |
| **Errores generales** | — | ruta inexistente, JSON mal formado, id con formato inválido |

En todos los casos se valida el **status HTTP** y la **estructura del body**. En los errores, además, el formato del módulo de errores: `status`, `error.code`, `error.message`, `method`, `path` y `timestamp`.

### Actualización de estados

Se agregó `PATCH /api/orders/{oid}/status` para cambiar el estado de un pedido y sincronizar su entrega:

| Estado actual | Puede pasar a |
|---|---|
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED` |
| `DELIVERED` / `CANCELLED` | — (estados finales) |

Body: `{ "status": "CONFIRMED", "courier": "<_id de un COURIER>" }`. `courier` es obligatorio para pasar a `SHIPPED` si la entrega todavía no tiene repartidor. Si la transición no está permitida, responde **409 `INVALID_STATUS_TRANSITION`**, un código nuevo del diccionario de errores.

## Carga de archivos (Multer)

La API permite subir **documentos de usuarios** y **comprobantes de pedidos y entregas** con [Multer](https://github.com/expressjs/multer), usando `multipart/form-data`. El archivo queda guardado en el servidor y **en MongoDB se registran solo sus metadatos**, asociados a la entidad que corresponde.

### Endpoints

| Método | Ruta | Campo del archivo | Campos extra | Se asocia a |
|---|---|---|---|---|
| POST | `/api/users/{uid}/documents` | `document` | `documentType` (obligatorio) | Usuario → `documents` |
| POST | `/api/orders/{oid}/receipts` | `receipt` | `receiptType` (opcional, por defecto `PAYMENT_RECEIPT`) | Pedido → `receipts` |
| POST | `/api/deliveries/{did}/receipts` | `receipt` | `receiptType` (opcional, por defecto `DELIVERY_PROOF`) | Entrega → `receipts` |

| Tipo | Valores permitidos |
|---|---|
| `documentType` | `IDENTIFICATION`, `PROOF_OF_ADDRESS`, `DRIVER_LICENSE`, `VEHICLE_INSURANCE` (las dos últimas solo para usuarios `COURIER`) |
| `receiptType` (pedidos) | `PAYMENT_RECEIPT`, `INVOICE` |
| `receiptType` (entregas) | `DELIVERY_PROOF`, `SIGNED_RECEIPT` |

**Archivos aceptados:** PDF, JPG y PNG (`application/pdf`, `image/jpeg`, `image/png`), de hasta **5 MB**, uno por request.

### Cómo probarlo

```bash
curl -X POST http://localhost:8080/api/users/<uid>/documents \
  -F "documentType=IDENTIFICATION" \
  -F "document=@./dni.pdf;type=application/pdf"

curl -X POST http://localhost:8080/api/deliveries/<did>/receipts \
  -F "receipt=@./firma.png;type=image/png"
```

También se puede probar desde Swagger (**http://localhost:8080/api/docs**, tag **Uploads**): **Try it out** → elegir el archivo → **Execute**.

Respuesta (201):

```json
{
  "status": "success",
  "payload": {
    "user": { "_id": "...", "first_name": "Ana", "documents": [ { "...": "..." } ] },
    "document": {
      "_id": "6b064b2d0d68c6fd29e10e86",
      "originalName": "dni.pdf",
      "fileName": "1795574573616-cd3c75af25499719.pdf",
      "path": "uploads/users/documents/1795574573616-cd3c75af25499719.pdf",
      "mimetype": "application/pdf",
      "size": 48213,
      "documentType": "IDENTIFICATION",
      "uploadedAt": "2026-11-24T23:42:53.000Z"
    }
  }
}
```

### Carpetas

```
uploads/
├── tmp/                    
├── users/
│   ├── documents/          
│   └── licenses/          
└── receipts/
    ├── orders/            
    └── deliveries/        
```

### Cómo funciona

1. **`src/config/multer.config.js`**: configuración centralizada de Multer: dónde se guarda (`diskStorage`), cómo se nombra, tipos aceptados (`fileFilter`), tamaño máximo (`limits`) y traducción de los errores de Multer a errores del dominio.
2. **`src/middlewares/upload.js`**: middlewares `uploadUserDocument` y `uploadReceipt`. Las rutas solo los conectan con el controller.
3. **`src/services/upload.service.js`**: valida el tipo de documento, que la entidad exista y las reglas de negocio (por ejemplo, las licencias solo para repartidores). Después mueve el archivo de `tmp/` a su carpeta final y registra los metadatos. **Si algo falla, borra el archivo**, así no quedan archivos huérfanos.
4. **Repositories** (`addDocument`, `addReceipt`): guardan los metadatos en el usuario, pedido o entrega (`src/models/fileMetadata.schema.js`).

### Errores de carga

Responden con el formato centralizado del proyecto (`ErrorResponse`):

| Código | HTTP | Cuándo |
|---|---|---|
| `FILE_REQUIRED` | 400 | No se envió archivo |
| `UNEXPECTED_FILE_FIELD` | 400 | El archivo vino en un campo distinto al esperado (`document` o `receipt`) o hay más de un archivo |
| `MISSING_FIELDS` | 400 | Falta `documentType` |
| `INVALID_DOCUMENT_TYPE` | 400 | `documentType` o `receiptType` inválido, o documento de repartidor para otro rol |
| `INVALID_FILE_TYPE` | 415 | El tipo de archivo no es PDF, JPG ni PNG |
| `FILE_TOO_LARGE` | 413 | El archivo supera los 5 MB |
| `USER_NOT_FOUND` / `ORDER_NOT_FOUND` / `DELIVERY_NOT_FOUND` | 404 | La entidad no existe |
| `FILE_SAVE_FAILED` | 500 | Error al guardar el archivo en disco |

### Logs

- `info`: documento cargado, comprobante asociado a un pedido o entrega.
- `warning`: intento de subir un tipo de archivo no permitido, y cualquier error 4xx de carga.
- `error`: falla al guardar el archivo.

### Tests de carga

`tests/functional/uploads.test.js` cubre la carga correcta de documentos (con el archivo guardado en su carpeta y los metadatos en la base), la licencia de un repartidor y los comprobantes de pedido y entrega. También cubre los errores: falta el archivo, falta el tipo, tipo de documento inválido, tipo de archivo no permitido, archivo de más de 5 MB, campo incorrecto y entidad inexistente. En los casos de error verifica además que no quede ningún archivo en el servidor.

En los tests, los archivos se guardan en una carpeta temporal del sistema (`UPLOADS_DIR`, que tiene que contener `test`) y se borran antes de cada test y al final de la suite.

## Producción, performance y Docker

### Variables de entorno

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `PORT` | Sí | — | Puerto de la API (en Docker: `8080`) |
| `MONGODB_URI` | Sí | — | URI de MongoDB (`mongodb://` o `mongodb+srv://`) |
| `NODE_ENV` | Sí | — | `development`, `test` o `production` |
| `LOG_LEVEL` | No | `debug` en desarrollo, `info` en producción | Nivel mínimo de logs: `fatal`, `error`, `warning`, `info`, `http`, `debug` |
| `PUBLIC_URL` | No | `http://localhost:<PORT>` | URL pública de la API (servicio externo). Se usa como servidor en Swagger |
| `UPLOADS_DIR` | No | `uploads` | Carpeta raíz de los archivos subidos |
| `BCRYPT_SALT_ROUNDS` | No | `10` | Costo del hash de passwords |
| `ENABLE_INTERNAL_ENDPOINTS` | No | `true`, salvo en producción (`false`) | Habilita `/api/mocks` y `/api/logger/test` |
| `SWAGGER_ENABLED` | No | `true`, salvo en producción (`false`) | Publica `/api/docs` y `/api/docs.json` |

La API **no usa JWT** (no tiene autenticación), así que no hay secreto de JWT. Ningún valor sensible está escrito en el código: todo sale de las variables de entorno.

Hay un ejemplo por entorno, todos sin valores sensibles:

| Archivo de ejemplo | Copiar como | Entorno |
|---|---|---|
| `.env.example` | `.env` | Desarrollo |
| `.env.test.example` | `.env.test` | Testing (ver sección Testing) |
| `.env.production.example` | `.env.production` | Producción / Docker |

**Validación al iniciar:** si falta `PORT`, `MONGODB_URI` o `NODE_ENV`, o si alguna variable tiene un valor inválido (`PORT` no numérico, `NODE_ENV` desconocido, URI mal formada, `LOG_LEVEL` inexistente, `PUBLIC_URL` que no es URL, booleanos distintos de `true`/`false`), **la app no arranca** y registra un log `fatal` con el motivo:

```
2026-11-24 23:59:01 [fatal]   No se pudo iniciar el servidor: [config] Faltan variables de entorno obligatorias: MONGODB_URI. Revisá tu archivo .env (podés copiar .env.example como base).
```

### Correr la API localmente

```bash
npm install
cp .env.example .env   
npm run dev            
npm start               
```

- API: `http://localhost:8080`
- Health check: `http://localhost:8080/health`
- Swagger: `http://localhost:8080/api/docs` 

### Correr los tests

```bash
npm test
```

No necesitan una base propia: usan una base en memoria (ver la sección Testing).

### Health check

`GET /health` responde siempre, en todos los entornos, y **no expone información sensible** (ni variables, ni URIs, ni versiones):

```json
{
  "status": "success",
  "api": "ok",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2026-11-25T03:00:00.000Z",
  "database": "connected"
}
```

Lo usa el `HEALTHCHECK` del contenedor de Docker.

### Criterio para los endpoints internos en producción

| Endpoint | Desarrollo / testing | Producción (por defecto) | Cómo cambiarlo |
|---|---|---|---|
| `/api/mocks/*` (GET) | Habilitado | **Deshabilitado** → 403 `INTERNAL_ENDPOINT_DISABLED` | `ENABLE_INTERNAL_ENDPOINTS=true` |
| `/api/mocks/seed*` (POST/DELETE) | Habilitado | **Siempre bloqueado** → 403 | No se puede habilitar: nunca se cargan datos de prueba en la base de producción |
| `/api/logger/test` | Habilitado | **Deshabilitado** → 403 `INTERNAL_ENDPOINT_DISABLED` | `ENABLE_INTERNAL_ENDPOINTS=true` |
| `/api/docs` (Swagger) | Habilitado | **No se publica** → 404 | `SWAGGER_ENABLED=true` |
| `/health` | Habilitado | Habilitado | — |

El motivo: los mocks y el logger test son herramientas de desarrollo y revisión, sin valor para un cliente real, y no tiene sentido exponerlas. Swagger expone el mapa completo de la API, así que en producción se publica solo si se decide explícitamente (por ejemplo, en un entorno de staging o para la corrección). Al arrancar, el servidor informa en el log qué quedó habilitado.

### Performance

- **Listados con paginación y límites:** `GET /api/users`, `/api/orders`, `/api/deliveries` y `/api/products` devuelven 10 resultados por defecto y **nunca más de 100** por página, aunque se pida más. Aceptan filtros (rol, estado, prioridad, categoría). Los populate traen solo los campos necesarios y las consultas usan `.lean()`.
- **Índices en MongoDB** para los filtros más usados: usuarios por rol, pedidos por estado/prioridad y por cliente, entregas por estado y por repartidor, y productos por estado/categoría.
- **Compresión gzip** de las respuestas (`compression`).
- **Límite de body JSON:** 100 KB (si se supera, 413 `PAYLOAD_TOO_LARGE`).
- **Mocks acotados:** máximo 500 registros por request.
- **Logs controlados:** en producción el nivel mínimo es `info`, así que no se registra cada request (`http`) ni el `debug`.
- **Sin operaciones que bloqueen el Event Loop** durante los requests: hash con bcrypt asíncrono y operaciones de archivos con `fs/promises`.
- **Apagado ordenado:** ante `SIGTERM`/`SIGINT` (por ejemplo `docker stop`), el servidor deja de aceptar requests, cierra la conexión a MongoDB y termina.

### Docker

**Archivos:**

- `Dockerfile`: imagen `node:22-slim`. Instala solo las dependencias de producción (`npm ci --omit=dev`), copia `src/`, corre con el usuario `node` (no root), expone el puerto **8080**, tiene `HEALTHCHECK` contra `/health` y arranca con `npm start`.
- `.dockerignore`: deja afuera de la imagen `node_modules`, `.env` y `.env.*`, `.git`, `logs`, `uploads`, `coverage`, archivos temporales, `*.log` y los tests.
- `docker-compose.yml` (opcional): levanta la API más un MongoDB, con volúmenes para `uploads`, `logs` y los datos.

**Construir la imagen:**

```bash
docker build -t shipnow-api .
```

**Ejecutar el contenedor** (las variables se pasan desde un archivo externo, nunca se copian a la imagen):

```bash
cp .env.production.example .env.production   
docker run -d --name shipnow --env-file .env.production -p 8080:8080 shipnow-api
```

Para probar Swagger dentro del contenedor, habilitalo al ejecutar:

```bash
docker run -d --name shipnow --env-file .env.production -e SWAGGER_ENABLED=true -p 8080:8080 shipnow-api
```

**Con Docker Compose** (API + MongoDB):

```bash
cp .env.production.example .env.production
docker compose up -d --build
```

**Probar:**

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/products
docker logs -f shipnow
docker stop shipnow
```

### Logs y uploads

- **Logs:** en el contenedor se escriben en la consola (se ven con `docker logs`) y en `/app/logs` (`error.log` y archivos diarios rotados, como en desarrollo). Para conservarlos al recrear el contenedor, montá un volumen: `-v shipnow_logs:/app/logs`.
- **Uploads:** se guardan en `/app/uploads`. **El sistema de archivos del contenedor es efímero**, así que en producción hay que montar un volumen (`-v shipnow_uploads:/app/uploads`, como en `docker-compose.yml`). Si se escala a varias instancias, conviene usar un almacenamiento externo compartido (por ejemplo S3). Los límites siguen aplicando (5 MB, solo PDF/JPG/PNG) y al iniciar se borran los temporales de `uploads/tmp` con más de una hora.

## Estructura

```
src/
├── config/              
├── constants/index.js   
├── mocks/              
│   ├── user.mock.js
│   ├── order.mock.js
│   ├── delivery.mock.js
│   └── locations.data.js
├── models/             
├── repositories/       
├── services/           
├── controllers/         
├── routes/             
├── docs/
├── errors/
├── middlewares/       
├── utils/              
├── app.js
└── server.js
tests/                  
logs/
uploads/
```

## ¿Por qué separé así la lógica entre Service y Repository?

El **Repository** se encarga de *cómo* se guardan y se buscan los datos. Es el único que conoce Mongoose: aplica filtros por defecto (excluye productos con borrado lógico), proyecciones (nunca devuelve el password), `populate` de relaciones, paginación, inserción masiva marcada como mock y validación de ids.

El **Service** se encarga de las *reglas del negocio*: calcula el estado del producto según el stock, valida campos y roles, hashea passwords y, en el mocking, valida cantidades, decide el orden de carga y arma las relaciones entre usuarios, pedidos, entregas y repartidores.

Las **fábricas de `mocks/`** solo generan objetos con la forma de cada modelo, sin saber nada de la base ni de HTTP. Por eso se pueden testear de forma aislada.