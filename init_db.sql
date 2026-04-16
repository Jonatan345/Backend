-- 1. Bersihkan sisa-sisa kegagalan sebelumnya
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. Buat Tabel Master Kategori
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Buat Tabel Menu dengan Relasi
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    estimated_time INTERVAL, 
    status VARCHAR(50) DEFAULT 'Uncooked',
    CONSTRAINT fk_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories(id) 
        ON DELETE RESTRICT
);

-- 4. Seed Data (Data Awal)
INSERT INTO categories (name) VALUES ('Makanan'), ('Minuman');

INSERT INTO menu_items (category_id, name, price, stock, estimated_time, status) VALUES
(1, 'Nasi Goreng Bima', 25000, 50, '00:05:00', 'Uncooked'),
(1, 'Ayam Bakar', 35000, 40, '00:15:00', 'Processed'),
(2, 'Es Teh Manis', 5000, 100, '00:02:00', 'Uncooked');