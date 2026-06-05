// File: dto/__test__/category.dto.test.js
const { validateCreateCategoryDto, validateUpdateCategoryDto } = require("../category.dto");

describe("Category DTO Validation - Unit Test", () => {
  
  // ─── VALIDATE CREATE CATEGORY ───
  describe("validateCreateCategoryDto", () => {
    test("Harus sukses (valid: true) jika nama kategori diisi dengan benar", () => {
      const body = { 
        name: "Sayuran Segar", 
        description: "Kategori untuk sayuran organik dan non-organik" 
      };
      const result = validateCreateCategoryDto(body);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("Harus sukses meskipun deskripsi tidak diisi (karena opsional)", () => {
      const body = { name: "Bumbu Dapur" };
      const result = validateCreateCategoryDto(body);
      expect(result.valid).toBe(true);
    });

    test("Harus gagal jika nama kategori kosong", () => {
      const bodyKosong = { description: "Kategori tanpa nama" };
      const result = validateCreateCategoryDto(bodyKosong);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });
  });

  // ─── VALIDATE UPDATE CATEGORY ───
  describe("validateUpdateCategoryDto", () => {
    test("Harus sukses saat memperbarui nama atau deskripsi", () => {
      const body = { name: "Daging Premium" };
      const result = validateUpdateCategoryDto(body);
      expect(result.valid).toBe(true);
    });

    test("Harus gagal jika nama atau deskripsi yang dikirim bukan format teks (string)", () => {
      const bodyFormatSalah = { name: 12345, description: true }; // Mengirim angka dan boolean
      const result = validateUpdateCategoryDto(bodyFormatSalah);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name must be a string");
      expect(result.errors).toContain("description must be a string");
    });
  });
});