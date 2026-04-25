-- 1. Clean up existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS supplier_transactions CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
-- (tetap ada inventory_movements, menu_items, categories, users)
-- 2. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add reset columns if not exists (for forgot password)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- 3. Create Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Create Menu Items Table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    estimated_time VARCHAR(20) NOT NULL, 
    status VARCHAR(50) DEFAULT 'Uncooked',
    CONSTRAINT fk_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories(id) 
        ON DELETE RESTRICT
);

-- 4. Create Inventory Movements Table
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    menu_item_id INT NOT NULL,
    quantity_change INT NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE')),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_item 
        FOREIGN KEY (menu_item_id) 
        REFERENCES menu_items(id) 
        ON DELETE CASCADE
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_transactions (
    id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL,
    menu_item_id INT,
    transaction_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_item_transaction FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
);

-- 5. Insert Sample Data - Users
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@bimaresto.com', '$2b$10$8K3.5Q8X9Y2Z4W6E8R0T2U4I6O8P0A2S4D6F8G0H2J4K6L8N0P2R', 'admin'),
('manager', 'manager@bimaresto.com', '$2b$10$8K3.5Q8X9Y2Z4W6E8R0T2U4I6O8P0A2S4D6F8G0H2J4K6L8N0P2R', 'manager'),
('staff', 'staff@bimaresto.com', '$2b$10$8K3.5Q8X9Y2Z4W6E8R0T2U4I6O8P0A2S4D6F8G0H2J4K6L8N0P2R', 'staff');

-- 6. Insert Sample Data - Categories
INSERT INTO categories (name) VALUES
('Makanan'),
('Minuman'),
('Dessert'),
('Fresh Ingredients (Meat)'),
('Fresh Ingredients (Poultry)'),
('Fresh Ingredients (Vegetables)'),
('Fresh Ingredients (Fruit)'),
('Fresh Ingredients (Seafood)'),
('Dry Ingredients'),
('Bottle'),
('Pastry');

-- 7. Insert Sample Data - Menu Items
INSERT INTO menu_items (category_id, name, price, stock, estimated_time, status) VALUES
(1, 'Nasi Goreng Bima', 25000, 50, '00:05:00', 'Uncooked'),
(1, 'Ayam Bakar', 35000, 40, '00:15:00', 'Processed'),
(1, 'Mie Goreng', 22000, 30, '00:07:00', 'Uncooked'),
(2, 'Es Teh Manis', 5000, 100, '00:02:00', 'Uncooked'),
(2, 'Jus Alpukat', 15000, 25, '00:05:00', 'Uncooked'),
(3, 'Es Krim Vanilla', 12000, 20, '00:01:00', 'Uncooked'),
(4, 'Daging Sapi Sirloin', 120000, 15, '00:00:00', 'Available'),
(5, 'Daging Ayam Fillet', 70000, 8, '00:00:00', 'Available'),
(5, 'Telur Ayam', 60000, 50, '00:00:00', 'Available'),
(6, 'Sayur Kol', 12000, 20, '00:00:00', 'Available'),
(7, 'Alpukat', 20000, 18, '00:00:00', 'Available'),
(8, 'Udang Segar', 90000, 10, '00:00:00', 'Available'),
(9, 'Beras Pandan Wangi', 12000, 100, '00:00:00', 'Available'),
(9, 'Gula Pasir', 10000, 50, '00:00:00', 'Available'),
(9, 'Kecap Manis', 25000, 40, '00:00:00', 'Available'),
(10, 'Minyak Goreng', 25000, 20, '00:00:00', 'Available'),
(11, 'Croissant', 18000, 30, '00:00:00', 'Available');

-- 8. Insert Sample Data - Inventory Movements
INSERT INTO inventory_movements (menu_item_id, quantity_change, movement_type, reason) VALUES
(1, 50, 'IN', 'Initial stock - Nasi Goreng Bima'),
(2, 40, 'IN', 'Initial stock - Ayam Bakar'),
(3, 30, 'IN', 'Initial stock - Mie Goreng'),
(4, 100, 'IN', 'Initial stock - Es Teh Manis'),
(5, 25, 'IN', 'Initial stock - Jus Alpukat'),
(6, 20, 'IN', 'Initial stock - Es Krim Vanilla'),
(7, 15, 'IN', 'Initial stock - Daging Sapi Sirloin'),
(8, 8, 'IN', 'Initial stock - Daging Ayam Fillet'),
(9, 50, 'IN', 'Initial stock - Telur Ayam'),
(10, 20, 'IN', 'Initial stock - Sayur Kol'),
(11, 18, 'IN', 'Initial stock - Alpukat'),
(12, 10, 'IN', 'Initial stock - Udang Segar'),
(13, 100, 'IN', 'Initial stock - Beras Pandan Wangi'),
(14, 50, 'IN', 'Initial stock - Gula Pasir'),
(15, 40, 'IN', 'Initial stock - Kecap Manis'),
(16, 20, 'IN', 'Initial stock - Minyak Goreng'),
(17, 30, 'IN', 'Initial stock - Croissant');

-- Insert some sample OUT movements
INSERT INTO inventory_movements (menu_item_id, quantity_change, movement_type, reason)
VALUES 
(1, -10, 'OUT', 'Terjual hari ini'),
(2, -15, 'OUT', 'Terjual hari ini'),
(9, -20, 'OUT', 'Terjual hari ini'),
(13, -30, 'OUT', 'Terjual hari ini');

INSERT INTO suppliers (name, company_name, category, phone, email, address, city, status) VALUES
('Budi', 'PT Sumber Makmur', 'Sayuran & Buah', '0812-3456-7890', 'budi@sumbermakmur.co.id', 'Jl. Industri No. 45', 'Bandung', 'Aktif'),
('Eko', 'CV Berkah Abadi', 'Daging & Seafood', '0856-6878-5432', 'eko@berkah.com', 'Jl. Merdeka No. 78', 'Jakarta', 'Aktif'),
('Ahmad', 'UD Mitra Sejati', 'Bumbu & Rempah', '0878-1234-5678', 'ahmad@mitraseajti.id', 'Jl. Nusantara No. 23', 'Surabaya', 'Nonaktif'),
('Dewan', 'PT Kamasian Prima', 'Kemasan & Alat', '0821-5555-6666', 'dev@kamasianprima.co.id', 'Jl. Industri Barat No. 12', 'Medan', 'Aktif');

INSERT INTO supplier_transactions (supplier_id, menu_item_id, transaction_type, quantity, amount, status, notes) VALUES
(1, 10, 'Pembelian', 45, 18500000, 'Completed', 'Sayuran segar minggu ke-1'),
(2, 7, 'Pembelian', 32, 62300000, 'Completed', 'Daging berkualitas premium'),
(3, 15, 'Pembelian', 18, 7650000, 'Completed', 'Bumbu lengkap untuk resep'),
(4, 16, 'Pembelian', 27, 9200000, 'Pending', 'Kemasan plastik food grade');
