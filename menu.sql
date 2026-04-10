-- 1. Membuat tabel menus untuk Bima Resto
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    nama_menu VARCHAR(100) NOT NULL,
    kategori VARCHAR(50),
    harga DECIMAL(10, 2) NOT NULL,
    stok INT DEFAULT 0
);

-- 2. Memasukkan data dummy Bima Resto - Pradita University
INSERT INTO menus (nama_menu, kategori, stok, timer, status) VALUES
('Nasi Goreng Bima', 'Makanan', 50, 00:05:10, 'Uncooked'),
('Ayam Bakar', 'Makanan', 40, 00:13:10, 'Processed'),
('Es Teh Manis', 'Minuman', 100, 00:05:10, 'Uncooked'),
('Jeruk Panas', 'Minuman', 50, 00:13:10, 'Processed');