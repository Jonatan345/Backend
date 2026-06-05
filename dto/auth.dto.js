// dto/auth.dto.js

function validateLoginDto(body) {
  // 1. Ubah destructuring dari 'email' menjadi 'username'
  const { username, password } = body; 
  const errors = [];

  // 2. Validasi teks biasa, bukan REGEX email lagi
  if (!username || typeof username !== "string") {
    errors.push("username is required");
  } else if (username.length < 3) {
    errors.push("username min 3 chars");
  }

  if (!password || typeof password !== "string") {
    errors.push("password is required");
  } else if (password.length < 6) {
    errors.push("password min 6 chars");
  }

  return { valid: errors.length === 0, errors };
}

function validateRegisterDto(body) {
  const { name, email, password, role } = body;
  const errors = [];

  if (!name || typeof name !== "string") errors.push("name is required");
  if (!email || typeof email !== "string") errors.push("email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email invalid");
  if (!password || password.length < 6) errors.push("password min 6 chars");
  if (role && !["admin", "staff"].includes(role)) errors.push("role must be admin or staff");

  return { valid: errors.length === 0, errors };
}

module.exports = { validateLoginDto, validateRegisterDto };