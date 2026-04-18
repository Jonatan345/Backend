-- 1. Clean up existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. Create Categories Table
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

-- 5. Insert Sample Data - Categories
INSERT INTO categories (name) VALUES 
('Makanan'), 
('Minuman'),
('Dessert');

-- 6. Insert Sample Data - Menu Items
INSERT INTO menu_items (category_id, name, price, stock, estimated_time, status) VALUES
(1, 'Nasi Goreng Bima', 25000, 50, '00:05:00', 'Uncooked'),
(1, 'Ayam Bakar', 35000, 40, '00:15:00', 'Processed'),
(1, 'Mie Goreng', 22000, 30, '00:07:00', 'Uncooked'),
(2, 'Es Teh Manis', 5000, 100, '00:02:00', 'Uncooked'),
(2, 'Jus Alpukat', 15000, 25, '00:05:00', 'Uncooked'),
(3, 'Es Krim Vanilla', 12000, 20, '00:01:00', 'Uncooked');

-- 7. Insert Sample Data - Inventory Movements
INSERT INTO inventory_movements (menu_item_id, quantity_change, movement_type, reason) VALUES
(1, 50, 'IN', 'Initial stock - Nasi Goreng Bima'),
(2, 40, 'IN', 'Initial stock - Ayam Bakar'),
(3, 30, 'IN', 'Initial stock - Mie Goreng'),
(4, 100, 'IN', 'Initial stock - Es Teh Manis'),
(5, 25, 'IN', 'Initial stock - Jus Alpukat'),
(6, 20, 'IN', 'Initial stock - Es Krim Vanilla'),
(1, -5, 'SALE', 'Sold 5 portions'),
(2, -3, 'SALE', 'Sold 3 portions');
