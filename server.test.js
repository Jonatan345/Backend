// File: server.test.js
const request = require('supertest');
const app = require('./server'); // Mengimpor app yang baru saja kita ekspor

// Palsukan (Mock) Prisma Client secara global agar tidak menembak DB asli
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    user: {
      findMany: jest.fn(),
    },
    // Tambahkan mock model lain di sini jika diperlukan nanti
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

describe('Server.js - Integration & Middleware Test', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Aplikasi Express harus berhasil diinisialisasi', () => {
    expect(app).toBeDefined();
  });

  test('2. Endpoint yang tidak terdaftar harus mengembalikan status 404', async () => {
    // Memastikan middleware Express berjalan normal untuk rute kosong
    const res = await request(app).get('/api/rute-hantu-yang-tidak-ada');
    expect(res.status).toBe(404);
  });

  test('3. Middleware Auth: Mengakses rute yang dilindungi tanpa token harus ditolak (401)', async () => {
    // Rute /api/kategori menggunakan authenticateToken
    const res = await request(app).get('/api/kategori');
    
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Access token required' });
  });

  test('4. Middleware Auth: Menggunakan token asal-asalan harus ditolak (403)', async () => {
    const res = await request(app)
      .get('/api/kategori')
      .set('Authorization', 'Bearer token_ngawur_123'); // Simulasi header
    
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Invalid or expired token' });
  });

  // Tambahkan di dalam berkas server.test.js

describe('Server.js - Integration & Middleware Test', () => {
  
  // ... (4 test Anda yang sudah PASS sebelumnya biarkan di sini) ...

  test('5. Integrasi DTO: Endpoint Login harus menolak request (400) jika format data cacat', async () => {
    // Simulasi frontend mengirim data login yang formatnya rusak/kosong
    const payloadCacat = { 
      username: "",     // Sengaja dikosongkan
      password: "12"    // Sengaja dibuat terlalu pendek
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(payloadCacat);
    
    // Ekspektasi: Server menolak dengan status HTTP 400 Bad Request
    expect(res.status).toBe(400);
    
    // Ekspektasi: Respon dari server harus berisi pesan peringatan dari DTO
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });

});
});