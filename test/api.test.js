import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';

const BASE = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`;
let token = '';
const createdIds = [];

const api = async (method, path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};

// ─── Setup: autenticar y limpiar la base ────────────────────────────────
// Se ejecuta una vez antes que todos los tests.
// Elimina todos los productos existentes para que cada ejecución
// arranque con una colección vacía y no haya falsos positivos/negativos
// por datos de ejecuciones anteriores.
before(async () => {
  const { data } = await api('POST', '/auth/login', {
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  token = data.token || '';

  const listRes = await fetch(`${BASE}/api/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const products = await listRes.json();
  if (Array.isArray(products)) {
    for (const p of products) {
      await fetch(`${BASE}/api/products/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
});

// ─── Auth ────────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('POST /auth/login — devuelve un token con credenciales válidas', async () => {
    const { status, data } = await api('POST', '/auth/login', {
      body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    assert.equal(status, 200);
    assert.ok(data.token);
  });

  it('POST /auth/login — 400 si faltan email y password', async () => {
    const { status, data } = await api('POST', '/auth/login', { body: {} });
    assert.equal(status, 400);
    assert.ok(data.error);
  });

  it('POST /auth/login — 401 si credenciales inválidas', async () => {
    const { status } = await api('POST', '/auth/login', {
      body: { email: 'x@x.com', password: 'wrong' },
    });
    assert.equal(status, 401);
  });
});

// ─── CRUD (crear 3, listar, leer, modificar, eliminar 1) ─────────────────

describe('CRUD productos', () => {
  const productos = [
    { name: 'Remera TechLab', price: 3500, description: 'Algodón talle M', stock: 25, category: 'Indumentaria' },
    { name: 'Mouse Inalámbrico', price: 2500, stock: 10, category: 'Periféricos' },
    { name: 'Teclado Mecánico', price: 8500, description: 'Switch Red', stock: 5, category: 'Periféricos' },
  ];

  it('POST /api/products/create — crear 3 productos', async () => {
    for (const p of productos) {
      const { status, data } = await api('POST', '/api/products/create', { token, body: p });
      assert.equal(status, 201);
      assert.ok(data.id);
      createdIds.push(data.id);
    }
    assert.equal(createdIds.length, 3);
  });

  it('GET /api/products — listar todos (debe haber al menos 3)', async () => {
    const { status, data } = await api('GET', '/api/products', { token });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 3);
  });

  it('GET /api/products/:id — leer uno por ID', async () => {
    const { status, data } = await api('GET', `/api/products/${createdIds[0]}`, { token });
    assert.equal(status, 200);
    assert.equal(data.name, productos[0].name);
  });

  it('PUT /api/products/:id — actualizar nombre y precio', async () => {
    const { status, data } = await api('PUT', `/api/products/${createdIds[0]}`, {
      token,
      body: { name: 'Remera TechLab Pro', price: 4200 },
    });
    assert.equal(status, 200);
    assert.equal(data.name, 'Remera TechLab Pro');
    assert.equal(data.price, 4200);
  });

  it('PUT /api/products/:id — actualizar solo un campo (description)', async () => {
    const { status, data } = await api('PUT', `/api/products/${createdIds[0]}`, {
      token,
      body: { description: 'Algodón premium talle M' },
    });
    assert.equal(status, 200);
    assert.equal(data.description, 'Algodón premium talle M');
    // Los campos anteriores deben preservarse
    assert.equal(data.name, 'Remera TechLab Pro');
  });

  it('PUT /api/products/:id — error si campo desconocido', async () => {
    const { status, data } = await api('PUT', `/api/products/${createdIds[0]}`, {
      token,
      body: { foo: 'bar' },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'foo'));
  });

  it('PUT /api/products/:id — 400 si name viene vacío', async () => {
    const { status, data } = await api('PUT', `/api/products/${createdIds[0]}`, {
      token,
      body: { name: '' },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'name'));
  });

  it('PUT /api/products/:id — 400 si price viene como string', async () => {
    const { status, data } = await api('PUT', `/api/products/${createdIds[0]}`, {
      token,
      body: { price: 'gratis' },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'price'));
  });

  it('DELETE /api/products/:id — eliminar SOLO el primero', async () => {
    const { status } = await api('DELETE', `/api/products/${createdIds[0]}`, { token });
    assert.equal(status, 200);
  });

  it('GET /api/products/:id — el eliminado da 404', async () => {
    const { status, data } = await api('GET', `/api/products/${createdIds[0]}`, { token });
    assert.equal(status, 404);
    assert.ok(data.error);
  });

  it('GET /api/products/:id — los otros 2 siguen existiendo', async () => {
    const r1 = await api('GET', `/api/products/${createdIds[1]}`, { token });
    assert.equal(r1.status, 200);
    const r2 = await api('GET', `/api/products/${createdIds[2]}`, { token });
    assert.equal(r2.status, 200);
  });
});

// ─── Validación Zod ──────────────────────────────────────────────────────

describe('Validación POST /api/products/create', () => {
  it('400 si falta name', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { price: 100 },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'name'));
  });

  it('400 si name viene vacío', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: '', price: 10 },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'name'));
  });

  it('400 si falta price', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: 'X' },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'price'));
  });

  it('400 si price es negativo', async () => {
    const { status } = await api('POST', '/api/products/create', {
      token, body: { name: 'X', price: -1 },
    });
    assert.equal(status, 400);
  });

  it('400 si price es string', async () => {
    const { status } = await api('POST', '/api/products/create', {
      token, body: { name: 'X', price: 'gratis' },
    });
    assert.equal(status, 400);
  });

  it('400 si hay campo desconocido', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: 'X', price: 10, foo: 'bar' },
    });
    assert.equal(status, 400);
    assert.ok(data.details?.some((d) => d.field === 'foo'));
  });

  it('201 si solo name + price (opcionales omitidos)', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: 'Prod Mínimo', price: 1 },
    });
    assert.equal(status, 201);
    if (data.id) createdIds.push(data.id);
  });
});

// ─── Manejo de errores ───────────────────────────────────────────────────

describe('Manejo de errores', () => {
  it('GET /api/products sin token → 401', async () => {
    const { status, data } = await api('GET', '/api/products');
    assert.equal(status, 401);
    assert.ok(data.error);
  });

  it('GET /api/products con token inválido → 403', async () => {
    const { status } = await api('GET', '/api/products', {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert.equal(status, 403);
  });

  it('GET /ruta-inexistente → 404', async () => {
    const { status, data } = await api('GET', '/ruta-inexistente');
    assert.equal(status, 404);
    assert.ok(data.error);
  });

  it('POST JSON malformado → 400', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.ok(data.error);
  });
});

// ─── Nombre duplicado ─────────────────────────────────────────────────────

describe('Nombre duplicado', () => {
  const nombreUnico = `Duplicado Test ${Date.now()}`;
  let idOriginal;
  let idOtro;

  it('POST /api/products/create — crear producto con nombre único', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: nombreUnico, price: 100 },
    });
    assert.equal(status, 201);
    assert.ok(data.id);
    idOriginal = data.id;
  });

  it('POST /api/products/create — 409 si se repite el nombre', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: nombreUnico, price: 200 },
    });
    assert.equal(status, 409);
    assert.ok(data.error);
  });

  it('POST /api/products/create — crear otro producto con nombre distinto', async () => {
    const { status, data } = await api('POST', '/api/products/create', {
      token, body: { name: 'Otro ' + nombreUnico, price: 50 },
    });
    assert.equal(status, 201);
    assert.ok(data.id);
    idOtro = data.id;
  });

  it('PUT /api/products/:id — 409 si se cambia a nombre ya existente', async () => {
    const { status, data } = await api('PUT', `/api/products/${idOtro}`, {
      token, body: { name: nombreUnico },
    });
    assert.equal(status, 409);
    assert.ok(data.error);
  });

  it('PUT /api/products/:id — 200 si se deja el mismo nombre (mismo ID)', async () => {
    const { status } = await api('PUT', `/api/products/${idOriginal}`, {
      token, body: { name: nombreUnico },
    });
    assert.equal(status, 200);
  });
});
