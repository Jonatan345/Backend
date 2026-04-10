const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // <-- INI DIA YANG HILANG! Pemanggil alat 'Pool'
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Konfigurasi Koneksi Neon Cloud Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Wajib untuk Neon
  }
});

// Cek Koneksi Database
pool.connect((err, client, release) => {
  if (err) {
    console.error('Yah, Gagal terhubung ke database:', err.stack);
  } else {
    console.log('Mantap! Berhasil terhubung ke database PostgreSQL (Neon) Bima Resto!');
  }
  if (release) release();
});

// Endpoint Utama
app.get('/', (req, res) => {
  res.send('Sistem Integrasi Bima Resto - Pradita University (Backend & Database Active!)');
});

// API Endpoint: Mengambil semua data Menu
app.get('/api/menu', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menus ORDER BY id ASC');
    res.json({
      status: 'success',
      total_data: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server' });
  }
});

// Menyalakan Server
app.listen(port, () => {
  console.log(`Server Backend Bima Resto berjalan di http://localhost:${port}`);
});
