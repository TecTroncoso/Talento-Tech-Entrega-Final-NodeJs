import * as ProductService from '../services/products.service.js';

// Los controllers no necesitan try/catch de shaping de errores.
// Los throws de los servicios y los rechazos de promesas se propagan
// al middleware central gracias a express-async-errors.

/**
 * GET /api/products
 * Devuelve todos los productos.
 */
export const getAll = async (req, res) => {
  const products = await ProductService.getAllProducts();
  res.status(200).json(products);
};

/**
 * GET /api/products/:id
 * Devuelve el producto con el ID indicado.
 */
export const getById = async (req, res) => {
  const { id } = req.params;
  const product = await ProductService.getProductById(id);
  res.status(200).json(product);
};

/**
 * POST /api/products/create
 * Crea un nuevo producto con los datos del body.
 */
export const create = async (req, res) => {
  const product = await ProductService.createProduct(req.body);
  res.status(201).json(product);
};

/**
 * DELETE /api/products/:id
 * Elimina el producto con el ID indicado.
 */
export const remove = async (req, res) => {
  const { id } = req.params;
  const result = await ProductService.deleteProduct(id);
  res.status(200).json({ message: 'Producto eliminado correctamente', ...result });
};

/**
 * PUT /api/products/:id
 * Actualiza los campos enviados del producto con el ID indicado.
 */
export const update = async (req, res) => {
  const { id } = req.params;
  const product = await ProductService.updateProduct(id, req.body);
  res.status(200).json(product);
};

export default { getAll, getById, create, update, remove };
