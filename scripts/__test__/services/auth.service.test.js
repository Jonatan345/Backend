// File: scripts/__test__/services/auth.service.test.js
const { loginUser } = require("./auth.service");     // Benar: Satu folder
const prisma = require("../../../prisma/client");    // FIX: Naik 3 tingkat ke root
const bcrypt = require("bcryptjs");

// Palsukan modul prisma lokal dengan path yang baru
jest.mock("../../../prisma/client", () => ({
  user: {
    findUnique: jest.fn(),
  },
}));
jest.mock("bcryptjs");

describe("Auth Service - Login Unit Test", () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Harus berhasil login jika username terdaftar dan password benar", async () => {
    const mockUser = {
      id: 1,
      username: "admin",
      password: "$2b$10$hashedpasswordxyz", 
      role: "admin"
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true); 

    const result = await loginUser("admin", "admin123");

    expect(result).toBeDefined();
    expect(result.username).toBe("admin");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: "admin" } });
  });

  test("Harus melempar error jika username tidak ditemukan di database", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(loginUser("user_ngawur", "rahasia")).rejects.toThrow(
      "User tidak ditemukan"
    );
  });
});