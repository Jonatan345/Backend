require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── Prisma Setup ─────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { Pool } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

// ─── Express Setup ────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bima-resto-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔑 Login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    console.log('👤 User found:', user ? user.username : 'NOT FOUND');

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      isValidPassword = (password === user.password);
    }

    console.log('🔐 Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'bima-resto-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        role: user.role || 'Admin',
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ─── SEED & DEBUG ROUTES ──────────────────────────────────────
app.post('/api/seed-users', async (req, res) => {
  try {
    const users = [
      { username: 'admin', password: 'admin123', name: 'Admin', role: 'Admin' },
      { username: 'manager', password: 'manager123', name: 'Manager', role: 'Manager' },
      { username: 'staff', password: 'staff123', name: 'Staff', role: 'Staff' },
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await prisma.user.upsert({
        where: { username: userData.username },
        update: { password: hashedPassword, name: userData.name, role: userData.role },
        create: {
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
          role: userData.role
        },
      });
    }

    res.json({
      message: '✅ Users seeded successfully!',
      users: [
        { username: 'admin', password: 'admin123' },
        { username: 'manager', password: 'manager123' },
        { username: 'staff', password: 'staff123' }
      ]
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/check-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true }
    });
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── KATEGORI ROUTES ──────────────────────────────────────────
// GET /api/kategori - get all categories
app.get('/api/kategori', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.kategori.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('❌ Get kategori error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/kategori - create category
app.post('/api/kategori', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const category = await prisma.kategori.create({
      data: { name, description: description || '' }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ Create kategori error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/kategori/:id - update category
app.put('/api/kategori/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.kategori.update({
      where: { id: parseInt(id) },
      data: { name, description }
    });
    res.json(category);
  } catch (error) {
    console.error('❌ Update kategori error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/kategori/:id - delete category
app.delete('/api/kategori/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.kategori.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('❌ Delete kategori error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── INVENTORY / BAHAN ROUTES ─────────────────────────────────
// GET /api/inventory - get all inventory items with category info
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { search, kategoriId, lowStock } = req.query;

    const where = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (kategoriId) {
      where.kategoriId = parseInt(kategoriId);
    }
    if (lowStock === 'true') {
      where.quantity = { lte: prisma.inventoryItem.fields.minStock };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: { kategori: true },
      orderBy: { name: 'asc' }
    });

    // Add lowStock flag to each item
    const itemsWithFlag = items.map(item => ({
      ...item,
      isLowStock: item.quantity <= (item.minStock || 0)
    }));

    res.json(itemsWithFlag);
  } catch (error) {
    console.error('❌ Get inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/inventory/summary - dashboard summary stats
app.get('/api/inventory/summary', authenticateToken, async (req, res) => {
  try {
    const allItems = await prisma.inventoryItem.findMany();

    const totalItems = allItems.length;
    const lowStockItems = allItems.filter(i => i.quantity <= (i.minStock || 0)).length;

    // Daily usage = sum of 'keluar' movements today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMovements = await prisma.inventoryMovement.findMany({
      where: {
        type: 'keluar',
        createdAt: { gte: today, lt: tomorrow }
      }
    });

    const dailyUsage = todayMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);

    res.json({
      totalItems,
      lowStockItems,
      dailyUsage
    });
  } catch (error) {
    console.error('❌ Get summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/inventory/weekly-trend - weekly usage trend for dashboard chart
app.get('/api/inventory/weekly-trend', authenticateToken, async (req, res) => {
  try {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const movements = await prisma.inventoryMovement.findMany({
        where: {
          createdAt: { gte: date, lt: nextDate }
        }
      });

      const masuk = movements.filter(m => m.type === 'masuk').reduce((s, m) => s + m.quantity, 0);
      const keluar = movements.filter(m => m.type === 'keluar').reduce((s, m) => s + m.quantity, 0);

      result.push({
        day: days[date.getDay()],
        masuk,
        keluar,
        date: date.toISOString().split('T')[0]
      });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Get weekly trend error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/inventory/top-used - most used items for dashboard
app.get('/api/inventory/top-used', authenticateToken, async (req, res) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: { type: 'keluar' },
      include: { inventoryItem: true }
    });

    // Aggregate by item
    const usageMap = {};
    movements.forEach(m => {
      const key = m.inventoryItemId;
      if (!usageMap[key]) {
        usageMap[key] = {
          id: key,
          name: m.inventoryItem?.name || 'Unknown',
          unit: m.inventoryItem?.unit || '',
          totalUsed: 0
        };
      }
      usageMap[key].totalUsed += m.quantity;
    });

    const sorted = Object.values(usageMap)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5);

    res.json(sorted);
  } catch (error) {
    console.error('❌ Get top used error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/inventory - create inventory item
app.post('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { name, quantity, unit, minStock, kategoriId, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        quantity: parseFloat(quantity) || 0,
        unit: unit || 'kg',
        minStock: parseFloat(minStock) || 0,
        kategoriId: kategoriId ? parseInt(kategoriId) : null,
        description: description || ''
      },
      include: { kategori: true }
    });

    // Log the initial stock as a 'masuk' movement
    if (item.quantity > 0) {
      await prisma.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: 'masuk',
          quantity: item.quantity,
          unit: item.unit,
          notes: `Initial stock - ${item.name}`,
          userId: req.user.userId
        }
      });
    }

    res.status(201).json(item);
  } catch (error) {
    console.error('❌ Create inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/inventory/:id - update inventory item
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, minStock, kategoriId, description } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id: parseInt(id) },
      data: {
        name,
        quantity: parseFloat(quantity),
        unit,
        minStock: parseFloat(minStock) || 0,
        kategoriId: kategoriId ? parseInt(kategoriId) : null,
        description
      },
      include: { kategori: true }
    });

    res.json(item);
  } catch (error) {
    console.error('❌ Update inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/inventory/:id - delete inventory item
app.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Delete related movements first
    await prisma.inventoryMovement.deleteMany({ where: { inventoryItemId: parseInt(id) } });
    await prisma.inventoryItem.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('❌ Delete inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── INVENTORY MOVEMENTS ROUTES ───────────────────────────────
// GET /api/inventory/movements - get movement log with optional filters
app.get('/api/inventory/movements', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, type, itemId } = req.query;

    const where = {};

    if (type && type !== 'semua') {
      where.type = type;
    }
    if (itemId) {
      where.inventoryItemId = parseInt(itemId);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        inventoryItem: { include: { kategori: true } },
        user: { select: { id: true, name: true, username: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(movements);
  } catch (error) {
    console.error('❌ Get movements error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/inventory/movements - record stock in/out
app.post('/api/inventory/movements', authenticateToken, async (req, res) => {
  try {
    const { inventoryItemId, type, quantity, unit, notes } = req.body;

    if (!inventoryItemId || !type || !quantity) {
      return res.status(400).json({ message: 'inventoryItemId, type, and quantity are required' });
    }
    if (!['masuk', 'keluar'].includes(type)) {
      return res.status(400).json({ message: 'type must be "masuk" or "keluar"' });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: parseInt(inventoryItemId) }
    });
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    const qty = parseFloat(quantity);
    if (type === 'keluar' && item.quantity < qty) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Update item quantity
    const newQuantity = type === 'masuk'
      ? item.quantity + qty
      : item.quantity - qty;

    await prisma.inventoryItem.update({
      where: { id: parseInt(inventoryItemId) },
      data: { quantity: newQuantity }
    });

    // Create movement record
    const movement = await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: parseInt(inventoryItemId),
        type,
        quantity: qty,
        unit: unit || item.unit,
        notes: notes || '',
        userId: req.user.userId
      },
      include: {
        inventoryItem: true,
        user: { select: { id: true, name: true, username: true } }
      }
    });

    res.status(201).json(movement);
  } catch (error) {
    console.error('❌ Create movement error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/inventory/movements/summary - stats for stock reports page
app.get('/api/inventory/movements/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const movements = await prisma.inventoryMovement.findMany({ where });

    const totalKeluar = movements.filter(m => m.type === 'keluar').length;
    const totalMasuk = movements.filter(m => m.type === 'masuk').length;
    const totalLog = movements.length;

    // Today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await prisma.inventoryMovement.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    });

    res.json({
      totalKeluar,
      totalMasuk,
      totalLog,
      aktivitasHariIni: todayCount
    });
  } catch (error) {
    console.error('❌ Get movements summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Seed users:      POST http://localhost:${PORT}/api/seed-users`);
  console.log(`🔍 Check users:     GET  http://localhost:${PORT}/api/check-users`);
  console.log(`🔑 Login:           POST http://localhost:${PORT}/api/auth/login`);
  console.log(`📦 Inventory:       GET  http://localhost:${PORT}/api/inventory`);
  console.log(`📊 Movements:       GET  http://localhost:${PORT}/api/inventory/movements`);
  console.log(`🏷️  Kategori:        GET  http://localhost:${PORT}/api/kategori`);
  console.log(`📈 Dashboard:       GET  http://localhost:${PORT}/api/inventory/summary`);
});
