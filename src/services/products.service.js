import * as ProductModel from '../models/product.model.js';

// El servicio ya no valida entrada — la validación ocurre en el
// middleware `validate(productCreateSchema)` antes de invocar el controlador.
// El servicio sólo lanza errores de dominio (404 cuando el producto no existe).

/**
 * Devuelve todos los productos.
 */
export const getAllProducts = async () => {
  return await ProductModel.getAllProducts();
};

/**
 * Devuelve un producto por su ID.
 * Lanza error 404 si no existe.
 */
export const getProductById = async (id) => {
  const product = await ProductModel.getProductById(id);
  if (!product) {
    throw { status: 404, message: `Producto con ID "${id}" no encontrado` };
  }
  return product;
};

/**
 * Crea un nuevo producto.
 * Valida que no exista otro producto con el mismo nombre.
 */
export const createProduct = async (data) => {
  const existing = await ProductModel.getProductByName(data.name);
  if (existing) {
    throw { status: 409, message: `Ya existe un producto con el nombre "${data.name}"` };
  }
  return await ProductModel.createProduct(data);
};

/**
 * Actualiza un producto existente.
 * Lanza error 404 si no existe. Valida que el nuevo nombre no esté en uso.
 */
export const updateProduct = async (id, data) => {
  const existing = await ProductModel.getProductById(id);
  if (!existing) {
    throw { status: 404, message: `Producto con ID "${id}" no encontrado` };
  }
  if (data.name) {
    const duplicate = await ProductModel.getProductByName(data.name);
    if (duplicate && duplicate.id !== id) {
      throw { status: 409, message: `Ya existe un producto con el nombre "${data.name}"` };
    }
  }
  return await ProductModel.updateProduct(id, data);
};

/**
 * Elimina un producto por su ID.
 * Lanza error 404 si no existe.
 */
export const deleteProduct = async (id) => {
  const product = await ProductModel.getProductById(id);
  if (!product) {
    throw { status: 404, message: `Producto con ID "${id}" no encontrado` };
  }
  return await ProductModel.deleteProduct(id);
};
