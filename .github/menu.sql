-- 1. Membuat tabel menus untuk Bima Resto
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    nama_menu VARCHAR(100) NOT NULL,
    kategori VARCHAR(50),
    harga DECIMAL(10, 2) NOT NULL,
    stok INT DEFAULT 0
);

-- 2. Memasukkan data dummy Bima Resto - Pradita University
INSERT INTO menus (nama_menu, kategori, harga, stok) VALUES
('Nasi Goreng Pradita', 'Makanan', 25000, 50),
('Mie Godok Bima', 'Makanan', 20000, 30),
('Ayam Geprek Kampus', 'Makanan', 22000, 40),
('Es Teh Manis', 'Minuman', 5000, 100),
('Kopi Susu Gula Aren', 'Minuman', 15000, 50);
