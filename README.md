# TechLab API

API REST para la administración del catálogo de productos de TechLab.
Construida con **Node.js + Express + Firebase Firestore + JWT**, con validación de entrada y manejo de errores centralizado.

---

## Estructura del proyecto

```
techlab-api/
├── index.js                              # Punto de entrada
├── package.json
├── vercel.json                           # Configuración para despliegue en Vercel
├── .env.example                          # Variables de entorno (plantilla)
├── public/                               # Frontend estático (SPA de prueba)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── src/
    ├── config/
    │   └── firebase.js                   # Inicialización de Firebase
    ├── routes/
    │   ├── products.routes.js            # CRUD /api/products
    │   └── auth.routes.js                # POST /auth/login
    ├── controllers/
    │   ├── products.controller.js
    │   └── auth.controller.js
    ├── services/
    │   ├── products.service.js           # Lógica de negocio
    │   └── auth.service.js               # Generación de JWT
    ├── models/
    │   └── product.model.js              # Acceso a Firestore
    ├── middlewares/
    │   ├── auth.middleware.js            # Verificación de Bearer Token
    │   ├── error.middleware.js           # Handler central de errores 4xx/5xx
    │   └── validate.middleware.js        # Factory de validación con Zod
    └── validators/
        └── products.schema.js            # Esquema Zod para POST /api/products/create
```

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con las credenciales reales de Firebase, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

### 3. Configurar Firebase

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Activar **Firestore Database** en modo producción o prueba.
3. Crear una colección `products` con al menos un documento de ejemplo.
4. Ir a **Configuración del proyecto → General** y copiar el objeto `firebaseConfig`.
5. Pegar los valores en el archivo `.env`.

### 4. Iniciar el servidor

```bash
npm run start
```

### 5. Acceder al Frontend (Dashboard)

Una vez iniciado el servidor local, puedes abrir en tu navegador:
[http://localhost:3000](http://localhost:3000)
Desde allí podrás iniciar sesión de manera gráfica, gestionar productos y ejecutar los tests automatizados visualmente.

---

## Despliegue en Vercel

El proyecto está configurado para ser desplegado de forma nativa en **Vercel** como *Serverless Functions*:

1. Sube tu código a un repositorio en GitHub.
2. Crea un nuevo proyecto en Vercel e importa tu repositorio.
3. En la configuración del proyecto en Vercel, ve a **Environment Variables** y agrega todas las variables de tu archivo `.env`.
4. Haz deploy. Vercel detectará el archivo `vercel.json` automáticamente, sirviendo tu frontend estático y enrutando `/api` y `/auth` al backend de Express.

---

## Endpoints

### Autenticación

| Método | Ruta          | Descripción                      | Auth requerida |
|--------|---------------|----------------------------------|----------------|
| POST   | /auth/login   | Devuelve un Bearer Token JWT     | No             |

**Body:**

```json
{ "email": "admin@techlab.com", "password": "tu_password" }
```

**Respuesta exitosa:**

```json
{ "token": "<JWT>" }
```

### Productos

Todas las rutas requieren el header `Authorization: Bearer <token>`.

| Método | Ruta                    | Descripción                       |
|--------|-------------------------|-----------------------------------|
| GET    | /api/products           | Lista todos los productos         |
| GET    | /api/products/:id       | Obtiene un producto por ID        |
| POST   | /api/products/create    | Crea un nuevo producto            |
| PUT    | /api/products/:id       | Actualiza campos de un producto   |
| DELETE | /api/products/:id       | Elimina un producto por ID        |

**Body para crear producto:**

```json
{
  "name":        "Remera TechLab",
  "description": "Remera de algodón talle M",
  "price":       3500,
  "stock":       25,
  "category":    "Indumentaria"
}
```

| Campo        | Obligatorio | Tipo     | Reglas                                        |
|--------------|-------------|----------|-----------------------------------------------|
| `name`       | ✅ Sí       | string   | 1 a 120 caracteres                            |
| `price`      | ✅ Sí       | number   | ≥ 0, finito. No acepta string ni negativo     |
| `description`| ❌ No       | string   | Máximo 2000 caracteres                        |
| `stock`      | ❌ No       | number   | Entero ≥ 0. No acepta decimales               |
| `category`   | ❌ No       | string   | Máximo 60 caracteres                          |

El body se valida con un esquema Zod antes de llegar al servicio. Campos desconocidos son rechazados. Además, el servicio verifica que no exista otro producto con el mismo `name` — si ya existe, devuelve **409 Conflict**. Esta validación también aplica al PUT si se intenta renombrar a un nombre ya ocupado.

---

## Códigos de estado y formato de error

Todas las respuestas 4xx/5xx se producen desde un único middleware central (`src/middlewares/error.middleware.js`) y comparten este sobre JSON:

**Error simple:**

```json
{ "error": "Mensaje en español" }
```

**Error de validación** (devuelve además `details` con la lista de problemas):

```json
{
  "error": "Errores de validación",
  "details": [
    { "field": "name", "message": "El campo \"name\" no puede estar vacío" },
    { "field": "price", "message": "El campo \"price\" debe ser un número positivo" }
  ]
}
```

| Código | Significado                                                |
|--------|------------------------------------------------------------|
| 200    | OK                                                         |
| 201    | Recurso creado                                             |
| 400    | Petición inválida (validación, JSON malformado)            |
| 401    | Sin token de autenticación                                 |
| 403    | Token inválido o expirado                                  |
| 404    | Ruta o recurso no encontrado                               |
| 409    | Conflicto — ya existe un producto con ese nombre           |
| 413    | Cuerpo de la petición supera el límite permitido           |
| 500    | Error interno del servidor / Firestore no responde         |

---

## Decisiones técnicas

- **ESM** (`"type": "module"`) en todo el proyecto. Imports con extensión `.js` explícita.
- **Manejo de errores centralizado** — un único middleware 4-arg de Express produce todas las respuestas de error. Los controllers y services no contienen `try/catch` de shaping; usan `throw { status, message }` o dejan que las promesas se propaguen (`express-async-errors` las captura en Express 4).
- **Validación con Zod** — esquemas por ruta, factory `validate(schema)` reutilizable. El body se reescribe con la versión parseada (con `.trim()` aplicado) antes de llegar al controlador.
- **Auth con JWT** — middleware de auth delega 401/403 al handler central vía `next({ status, message })`, sin escribir la respuesta inline.
- **404 absorbido** — un forwarder 3-arg al final de las rutas dispara `next({ status: 404 })` para que la respuesta la produzca el handler central con la misma forma que el resto de los errores.
