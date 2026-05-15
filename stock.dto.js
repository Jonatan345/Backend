// dto/stock.dto.js

function validateCreateStockDto(body) {
  const { name, categoryId, supplierId, quantity, unit, minStock, price } = body;
  const errors = [];

  if (!name || typeof name !== "string") errors.push("name is required");
  if (!categoryId) errors.push("categoryId is required");
  if (!supplierId) errors.push("supplierId is required");
  if (quantity === undefined || isNaN(Number(quantity))) errors.push("quantity must be a number");
  if (!unit || typeof unit !== "string") errors.push("unit is required");
  if (minStock === undefined || isNaN(Number(minStock))) errors.push("minStock must be a number");
  if (price === undefined || isNaN(Number(price))) errors.push("price must be a number");

  return { valid: errors.length === 0, errors };
}

function validateUpdateStockDto(body) {
  const { name, categoryId, supplierId, quantity, unit, minStock, price } = body;
  const errors = [];

  if (name !== undefined && typeof name !== "string") errors.push("name must be a string");
  if (quantity !== undefined && isNaN(Number(quantity))) errors.push("quantity must be a number");
  if (minStock !== undefined && isNaN(Number(minStock))) errors.push("minStock must be a number");
  if (price !== undefined && isNaN(Number(price))) errors.push("price must be a number");

  return { valid: errors.length === 0, errors };
}

function validateStockTransactionDto(body) {
  const { stockId, type, quantity, note } = body;
  const errors = [];

  if (!stockId) errors.push("stockId is required");
  if (!type || !["in", "out"].includes(type)) errors.push("type must be 'in' or 'out'");
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0)
    errors.push("quantity must be a positive number");

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateStockDto, validateUpdateStockDto, validateStockTransactionDto };