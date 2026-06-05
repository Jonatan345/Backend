const prisma = require("../../../prisma/client"); // FIX: Naik 3 tingkat
const bcrypt = require("bcryptjs");

async function loginUser(username, password) {
  // 1. Cari user berdasarkan username menggunakan Prisma
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  // 2. Validasi kata sandi menggunakan bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Kata sandi salah");
  }

  return user;
}

module.exports = { loginUser };