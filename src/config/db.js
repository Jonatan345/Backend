const { Pool } = require('pg');
require('dotenv').config();

// Membuat koneksi ke PostgreSQL menggunakan data dari .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Mengecek apakah koneksi berhasil
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error saat menyambungkan ke PostgreSQL:', err.stack);
  }
  console.log('Berhasil terhubung ke database PostgreSQL Bima Resto!');
  release();
});

module.exports = pool;
