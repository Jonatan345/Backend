// File: dto/__test__/supplier.dto.test.js
const { validateCreateSupplierDto, validateUpdateSupplierDto } = require("../supplier.dto");
const { validateReportQueryDto } = require("../report.dto");

describe("Supplier & Report DTO Validation - Unit Test", () => {

  // ─── VALIDATE CREATE SUPPLIER ───
  describe("validateCreateSupplierDto", () => {
    test("Harus sukses (valid: true) jika data supplier lengkap dan benar", () => {
      const body = {
        name: "PT. Sumber Ayam Segar",
        phone: "08123456789",
        email: "sales@sumberayam.com",
        address: "Jl. Industri No. 12, Jakarta"
      };
      const result = validateCreateSupplierDto(body);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("Harus gagal jika nama supplier kosong", () => {
      const bodyTanpaNama = { email: "supplier@mail.com" };
      const result = validateCreateSupplierDto(bodyTanpaNama);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });

    test("Harus gagal jika format email tidak valid (tanpa @ atau domain)", () => {
      const bodyEmailSalah = {
        name: "CV. Sayur Organik",
        email: "sayurorganik.com" // Salah format
      };
      const result = validateCreateSupplierDto(bodyEmailSalah);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("email invalid");
    });
  });

  // ─── VALIDATE UPDATE SUPPLIER ───
  describe("validateUpdateSupplierDto", () => {
    test("Harus sukses saat memperbarui data dengan nama atau email yang valid", () => {
      const body = { name: "PT. Sumber Ayam New", email: "new@sumberayam.com" };
      const result = validateUpdateSupplierDto(body);
      expect(result.valid).toBe(true);
    });

    test("Harus gagal jika email pembaruan tidak valid", () => {
      const body = { email: "email-salah-bos" };
      const result = validateUpdateSupplierDto(body);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("email invalid");
    });
  });

  // ─── VALIDATE REPORT QUERY ───
  describe("validateReportQueryDto", () => {
    test("Harus sukses jika rentang tanggal laporan valid", () => {
      const query = {
        startDate: "2026-06-01",
        endDate: "2026-06-15",
        type: "all"
      };
      const result = validateReportQueryDto(query);
      expect(result.valid).toBe(true);
    });

    test("Harus gagal jika tanggal mulai (startDate) melampaui tanggal akhir (endDate)", () => {
      const queryTerbalik = {
        startDate: "2026-06-15",
        endDate: "2026-06-01", // Kebalik!
        type: "in"
      };
      const result = validateReportQueryDto(queryTerbalik);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("startDate must be before endDate");
    });

    test("Harus gagal jika tipe laporan di luar 'in', 'out', atau 'all'", () => {
      const queryTipeNgawur = { type: "broken" }; // Salah tipe
      const result = validateReportQueryDto(queryTipeNgawur);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("type must be 'in', 'out', or 'all'");
    });
  });
});