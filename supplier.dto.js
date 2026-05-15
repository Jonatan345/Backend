// dto/supplier.dto.js

function validateCreateSupplierDto(body) {
  const { name, contact, phone, email, address } = body;
  const errors = [];

  if (!name || typeof name !== "string") errors.push("name is required");
  if (phone !== undefined && typeof phone !== "string") errors.push("phone must be a string");
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("email invalid");
  if (address !== undefined && typeof address !== "string") errors.push("address must be a string");

  return { valid: errors.length === 0, errors };
}

function validateUpdateSupplierDto(body) {
  const { name, contact, phone, email, address } = body;
  const errors = [];

  if (name !== undefined && typeof name !== "string") errors.push("name must be a string");
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("email invalid");

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateSupplierDto, validateUpdateSupplierDto };