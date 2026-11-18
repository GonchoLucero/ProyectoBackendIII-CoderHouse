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
├── errors/
├── middlewares/       
├── utils/              
├── app.js
└── server.js
tests/                  
```

## ¿Por qué separé así la lógica entre Service y Repository?

El **Repository** se encarga de *cómo* se guardan y se buscan los datos. Es el único que conoce Mongoose: aplica filtros por defecto (excluye productos con borrado lógico), proyecciones (nunca devuelve el password), `populate` de relaciones, paginación, inserción masiva marcada como mock y validación de ids.

El **Service** se encarga de las *reglas del negocio*: calcula el estado del producto según el stock, valida campos y roles, hashea passwords y, en el mocking, valida cantidades, decide el orden de carga y arma las relaciones entre usuarios, pedidos, entregas y repartidores.

Las **fábricas de `mocks/`** solo generan objetos con la forma de cada modelo, sin saber nada de la base ni de HTTP. Por eso se pueden testear de forma aislada.