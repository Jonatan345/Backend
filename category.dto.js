// dto/category.dto.js

function validateCreateCategoryDto(body) {
  const { name, description } = body;
  const errors = [];

  if (!name || typeof name !== "string") errors.push("name is required");
  if (description !== undefined && typeof description !== "string")
    errors.push("description must be a string");

  return { valid: errors.length === 0, errors };
}

function validateUpdateCategoryDto(body) {
  const { name, description } = body;
  const errors = [];

  if (name !== undefined && typeof name !== "string") errors.push("name must be a string");
  if (description !== undefined && typeof description !== "string")
    errors.push("description must be a string");

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateCategoryDto, validateUpdateCategoryDto };