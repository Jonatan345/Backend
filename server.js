const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
// Menggunakan port 8080 sebagai standar tunggal
const PORT = process.env.PORT || 8080;

// ==========================================
// 1. MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// 2. KONFIGURASI DATABASE (NEON)
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Wajib untuk koneksi aman ke Neon
    }
});

// Cek koneksi saat startup
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Gagal terhubung ke Neon DB:', err.stack);
    }
    console.log('Berhasil terhubung ke database Neon.');
    release();
});

// ==========================================
// 3. ROUTES (GABUNGAN)
// ==========================================

// GANTI rute kategori lama kamu dengan ini di server.js
app.get('/api/kategori', async (req, res) => {
    try {
        // Query ini mengambil data menu dan menggabungkannya dengan nama kategorinya
        const result = await pool.query(`
            SELECT m.*, c.name as nama_kategori 
            FROM menu_items m 
            JOIN categories c ON m.category_id = c.id
            ORDER BY m.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error Database:", err.message);
        res.status(500).send('Server Error pada Kategori: Tabel tidak ditemukan atau query salah');
    }
});

// Tambahkan route test untuk memastikan server aktif
app.get('/', (req, res) => {
    res.send('Bima Resto Unified Backend API is Running...');
});

// Tambahkan rute ini agar bisa dibuka di browser
app.get('/api/inventory/movements', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory_movements ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Database Error: Pastikan tabel inventory_movements sudah dibuat di Neon.');
    }
});
// ==========================================
// 4. JALANKAN SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`
🚀 Server Terkonsolidasi Berjalan!
----------------------------------
Alamat: http://localhost:${PORT}
Database: Neon Cloud (PostgreSQL)
Endpoint Kategori: http://localhost:${PORT}/api/kategori
Endpoint Inventory: http://localhost:${PORT}/api/inventory/movements
    `);
});
