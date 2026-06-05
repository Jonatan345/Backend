const { validateLoginDto, validateRegisterDto } = require("../auth.dto");

describe("Auth DTO Validation - Unit Test", () => {
  // ─── LOGIN DTO ───
  describe("validateLoginDto", () => {
    test("Harus lolos validasi (valid: true) jika email dan password sesuai aturan", () => {
      const body = { email: "admin@bimaresto.com", password: "password123" };
      const result = validateLoginDto(body);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("Harus gagal jika email kosong atau format salah", () => {
      const bodyFormatSalah = { email: "adminbimasalah", password: "password123" };
      const result = validateLoginDto(bodyFormatSalah);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("email invalid");
    });

    test("Harus gagal jika password kurang dari 6 karakter", () => {
      const bodyPasswordPendek = { email: "admin@bimaresto.com", password: "123" };
      const result = validateLoginDto(bodyPasswordPendek);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("password min 6 chars");
    });
  });

  // ─── REGISTER DTO ───
  describe("validateRegisterDto", () => {
    test("Harus gagal jika role yang dimasukkan di luar 'admin' atau 'staff'", () => {
      const bodyRoleNgawur = {
        name: "Chef Bima",
        email: "chef@bima.com",
        password: "password123",
        role: "manager", // Role ini tidak diizinkan di kode Anda
      };
      const result = validateRegisterDto(bodyRoleNgawur);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("role must be admin or staff");
    });
  });
});