// File: dto/__test__/report.dto.test.js
const { validateReportQueryDto } = require("../report.dto");

describe("Report DTO Validation - Unit Test", () => {
  
  describe("validateReportQueryDto", () => {
    test("Harus sukses jika rentang tanggal dan tipe laporan valid", () => {
      const query = {
        startDate: "2026-06-01",
        endDate: "2026-06-15",
        type: "all"
      };
      const result = validateReportQueryDto(query);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("Harus gagal jika format tanggal tidak valid", () => {
      const queryTanggalSalah = {
        startDate: "bukan-tanggal",
        endDate: "2026-06-15"
      };
      const result = validateReportQueryDto(queryTanggalSalah);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("startDate invalid format");
    });

    test("Harus gagal jika tanggal mulai (startDate) melampaui tanggal akhir (endDate)", () => {
      const queryTerbalik = {
        startDate: "2026-06-15",
        endDate: "2026-06-01", // Tanggal akhir lebih tua dari tanggal mulai
        type: "in"
      };
      const result = validateReportQueryDto(queryTerbalik);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("startDate must be before endDate");
    });

    test("Harus gagal jika tipe laporan di luar 'in', 'out', atau 'all'", () => {
      const queryTipeNgawur = { type: "cetak" }; // Salah tipe
      const result = validateReportQueryDto(queryTipeNgawur);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("type must be 'in', 'out', or 'all'");
    });
  });
});