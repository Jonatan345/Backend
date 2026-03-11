const express = require('express');
const cors = require('cors');

const app = express();
// Azure menggunakan process.env.PORT, jadi kita harus menyiapkannya
const port = process.env.PORT || 8080; 

// Middleware
app.use(cors()); // Mengizinkan frontend mengambil data
app.use(express.json()); // Agar bisa menerima data format JSON

// Endpoint 1: Cek Status Server (Halaman Utama)
app.get('/', (req, res) => {
  res.send('Sistem Integrasi Bima Resto - Pradita University (Backend Berjalan Normal!)');
});

// Endpoint 2: Contoh API untuk Frontend (Daftar Menu)
app.get('/api/menu', (req, res) => {
  res.json({
    status: 'success',
    data: [
      { id: 1, nama: 'Nasi Goreng Pradita', harga: 25000 },
      { id: 2, nama: 'Mie Godok Bima', harga: 20000 },
      { id: 3, nama: 'Es Teh Kampus', harga: 5000 }
    ]
  });
});

// Menyalakan Server
app.listen(port, () => {
  console.log(`Server Bima Resto berjalan di port ${port}`);
});
