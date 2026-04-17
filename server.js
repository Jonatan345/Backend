const express = require('express');
const cors = require('cors');
const prisma = require('./prisma/client'); // Import Prisma

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// ========== KATEGORI ENDPOINTS ==========

// GET semua kategori
app.get('/api/kategori', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    console.error('Error Database:', err.message);
    res.status(500).send('Server Error pada Kategori: ' + err.message);
  }
});

// POST kategori baru
app.post('/api/kategori', async (req, res) => {
  const { name } = req.body;
  try {
    const newCategory = await prisma.category.create({
      data: { name }
    });
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Gagal menambah kategori');
  }
});

// ========== MENU ITEMS ENDPOINTS ==========

// GET semua menu items dengan kategori
app.get('/api/menu', async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      include: {
        category: true // Include kategori relation
      },
      orderBy: { id: 'asc' }
    });
    res.json(menuItems);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Server Error pada Menu');
  }
});

// POST menu item baru
app.post('/api/menu', async (req, res) => {
  const { categoryId, name, price, stock, estimatedTime, status } = req.body;
  try {
    const newMenuItem = await prisma.menuItem.create({
      data: {
        categoryId,
        name,
        price,
        stock,
        estimatedTime,
        status
      }
    });
    res.status(201).json(newMenuItem);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Gagal menambah menu item');
  }
});

// ========== INVENTORY MOVEMENTS ENDPOINTS ==========

// GET semua inventory movements
app.get('/api/inventory/movements', async (req, res) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        menuItem: {
          include: {
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Server Error pada Inventory Movements');
  }
});

// POST inventory movement baru
app.post('/api/inventory/movements', async (req, res) => {
  const { menuItemId, quantityChange, movementType, reason } = req.body;
  try {
    const movement = await prisma.inventoryMovement.create({
      data: {
        menuItemId,
        quantityChange,
        movementType,
        reason
      }
    });
    res.status(201).json(movement);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Gagal mencatat movement');
  }
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
  res.send('Bima Resto Unified Backend API is Running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server Terkonsolidasi Berjalan!`);
  console.log(`Alamat: http://localhost:${PORT}`);
  console.log(`Database: Neon Cloud (PostgreSQL)`);
  console.log(`Endpoint Kategori: http://localhost:${PORT}/api/kategori`);
  console.log(`Endpoint Menu: http://localhost:${PORT}/api/menu`);
  console.log(`Endpoint Inventory: http://localhost:${PORT}/api/inventory/movements`);
  console.log(`\nBerhasil terhubung ke database Neon.`);
});
