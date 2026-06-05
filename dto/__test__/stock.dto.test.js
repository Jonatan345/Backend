// File: dto/__test__/stock.dto.test.js
const { 
  validateCreateStockDto, 
  validateUpdateStockDto, 
  validateStockTransactionDto 
} = require("../stock.dto"); // Mengarah ke dto/stock.dto.js

describe("Stock DTO Validation - Unit Test", () => {
  
  // ─── VALIDATE CREATE STOCK ───
  describe("validateCreateStockDto", () => {
    test("Harus sukses (valid: true) jika semua data stok lengkap dan benar", () => {
      const body = {
        name: "Daging Ayam Fillet",
        categoryId: 1,
        supplierId: 2,
        quantity: 10,
        unit: "Kg",
        minStock: 5,
        price: 45000
      };
      const result = validateCreateStockDto(body);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("Harus gagal jika nama, categoryId, atau supplierId kosong", () => {
      const bodyKosong = {
        name: "", // Kosong
        categoryId: null,
        supplierId: undefined,
        quantity: 10,
        unit: "Kg",
        minStock: 5,
        price: 45000
      };
      const result = validateCreateStockDto(bodyKosong);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
      expect(result.errors).toContain("categoryId is required");
      expect(result.errors).toContain("supplierId is required");
    });

    test("Harus gagal jika quantity, minStock, atau price bukan angka", () => {
      const bodyBukanAngka = {
        name: "Minyak Goreng",
        categoryId: 1,
        supplierId: 1,
        quantity: "sepuluh", // Salah
        unit: "Liter",
        minStock: "lima",    // Salah
        price: "dua ribu"    // Salah
      };
      const result = validateCreateStockDto(bodyBukanAngka);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("quantity must be a number");
      expect(result.errors).toContain("minStock must be a number");
      expect(result.errors).toContain("price must be a number");
    });
  });

  // ─── VALIDATE UPDATE STOCK ───
  describe("validateUpdateStockDto", () => {
    test("Harus sukses saat memperbarui data dengan format angka yang benar", () => {
      const body = { quantity: 20, price: 50000 };
      const result = validateUpdateStockDto(body);
      expect(result.valid).toBe(true);
    });

    test("Harus gagal jika data pembaruan bukan angka", () => {
      const body = { quantity: "banyak" };
      const result = validateUpdateStockDto(body);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("quantity must be a number");
    });
  });

  // ─── VALIDATE STOCK TRANSACTION ───
  describe("validateStockTransactionDto", () => {
    test("Harus sukses jika transaksi masuk/keluar valid", () => {
      const body = { stockId: 1, type: "in", quantity: 5 };
      const result = validateStockTransactionDto(body);
      expect(result.valid).toBe(true);
    });

    test("Harus gagal jika tipe transaksi bukan 'in' atau 'out'", () => {
      const body = { stockId: 1, type: "broken", quantity: 5 };
      const result = validateStockTransactionDto(body);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("type must be 'in' or 'out'");
    });

    test("Harus gagal jika kuantitas transaksi bernilai 0 atau negatif", () => {
      const body = { stockId: 1, type: "out", quantity: -5 };
      const result = validateStockTransactionDto(body);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("quantity must be a positive number");
    });
  });
});