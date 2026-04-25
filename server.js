require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── Prisma Setup ─────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'bima-resto-secret-key');
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔑 Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('👤 User lookup result:', user ? 'FOUND' : 'NOT FOUND');

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log('🔐 bcrypt compare result:', isValidPassword);
    } catch (e) {
      isValidPassword = (password === user.password);
      console.log('🔐 Plain text fallback used');
    }

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'bima-resto-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      message: 'Server error during login',
      error: error.message
    });
  }
});

// ─── SEED USERS ───────────────────────────────────────────────
app.post('/api/seed-users', async (req, res) => {
  try {
    const users = [
      { username: 'admin',   email: 'admin@bimaresto.com',   password: 'admin123',   role: 'admin' },
      { username: 'manager', email: 'manager@bimaresto.com', password: 'manager123', role: 'manager' },
      { username: 'staff',   email: 'staff@bimaresto.com',   password: 'staff123',   role: 'staff' },
    ];

    for (const u of users) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { username: u.username },
        update: { password: hashedPassword, email: u.email, role: u.role },
        create: { username: u.username, email: u.email, password: hashedPassword, role: u.role },
      });
    }

    res.json({
      message: '✅ Users seeded successfully!',
      credentials: [
        { username: 'admin',   password: 'admin123' },
        { username: 'manager', password: 'manager123' },
        { username: 'staff',   password: 'staff123' },
      ]
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── CHECK USERS (debug) ──────────────────────────────────────
app.get('/api/check-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true }
    });
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// KATEGORI → model: Category  (table: categories)
// ═══════════════════════════════════════════════════════════════

app.get('/api/kategori', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { menuItems: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('❌ Get kategori error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/kategori', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ Create kategori error:', error);
    if (error.code === 'P2002') return res.status(400).json({ message: 'Category name already exists' });
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/kategori/:id', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name }
    });
    res.json(category);
  } catch (error) {
    console.error('❌ Update kategori error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/kategori/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('❌ Delete kategori error:', error);
    if (error.code === 'P2003') return res.status(400).json({ message: 'Cannot delete: category has menu items' });
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// INVENTORY → model: MenuItem  (table: menu_items)
// ═══════════════════════════════════════════════════════════════

app.get('/api/inventory/summary', authenticateToken, async (req, res) => {
  try {
    const allItems = await prisma.menuItem.findMany();
    const totalItems = allItems.length;
    const lowStockItems = allItems.filter(i => i.stock <= 10).length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMovements = await prisma.inventoryMovement.findMany({
      where: { quantityChange: { lt: 0 }, createdAt: { gte: today, lt: tomorrow } }
    });
    const dailyUsage = todayMovements.reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

    res.json({ totalItems, lowStockItems, dailyUsage });
  } catch (error) {
    console.error('❌ Summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/inventory/weekly-trend', authenticateToken, async (req, res) => {
  try {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - i);
      const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);

      const movements = await prisma.inventoryMovement.findMany({
        where: { createdAt: { gte: date, lt: nextDate } }
      });

      const masuk  = movements.filter(m => m.quantityChange > 0).reduce((s, m) => s + m.quantityChange, 0);
      const keluar = movements.filter(m => m.quantityChange < 0).reduce((s, m) => s + Math.abs(m.quantityChange), 0);

      result.push({ day: days[date.getDay()], masuk, keluar, date: date.toISOString().split('T')[0] });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Weekly trend error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/inventory/top-used', authenticateToken, async (req, res) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: { quantityChange: { lt: 0 } },
      include: { menuItem: { include: { category: true } } }
    });

    const usageMap = {};
    movements.forEach(m => {
      const key = m.menuItemId;
      if (!usageMap[key]) {
        usageMap[key] = { id: key, name: m.menuItem?.name || 'Unknown', category: m.menuItem?.category?.name || '-', totalUsed: 0 };
      }
      usageMap[key].totalUsed += Math.abs(m.quantityChange);
    });

    res.json(Object.values(usageMap).sort((a, b) => b.totalUsed - a.totalUsed).slice(0, 5));
  } catch (error) {
    console.error('❌ Top used error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { search, categoryId, status } = req.query;
    const where = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (status) where.status = status;

    const items = await prisma.menuItem.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' }
    });

    res.json(items.map(item => ({ ...item, isLowStock: item.stock <= 10 })));
  } catch (error) {
    console.error('❌ Get inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { name, categoryId, price, stock, estimatedTime, status } = req.body;
    if (!name || !categoryId) return res.status(400).json({ message: 'name and categoryId are required' });

    const item = await prisma.menuItem.create({
      data: {
        name,
        categoryId: parseInt(categoryId),
        price: price ? parseFloat(price) : null,
        stock: parseInt(stock) || 0,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        status: status || 'active'
      },
      include: { category: true }
    });

    if (item.stock > 0) {
      await prisma.inventoryMovement.create({
  data: { menuItemId: item.id, quantityChange: item.stock, movementType: 'IN', reason: `Initial stock - ${item.name}` }
});
    }

    res.status(201).json(item);
  } catch (error) {
    console.error('❌ Create inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { name, categoryId, price, stock, estimatedTime, status } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(categoryId !== undefined && { categoryId: parseInt(categoryId) }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(estimatedTime !== undefined && { estimatedTime: parseInt(estimatedTime) }),
        ...(status !== undefined && { status }),
      },
      include: { category: true }
    });
    res.json(item);
  } catch (error) {
    console.error('❌ Update inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.inventoryMovement.deleteMany({ where: { menuItemId: id } });
    await prisma.supplierTransaction.updateMany({ where: { menuItemId: id }, data: { menuItemId: null } });
    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('❌ Delete inventory error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// INVENTORY MOVEMENTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/inventory/movements', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, type, itemId } = req.query;
    const where = {};

    if (itemId) where.menuItemId = parseInt(itemId);
    if (type === 'masuk')  where.quantityChange = { gt: 0 };
    if (type === 'keluar') where.quantityChange = { lt: 0 };
    if (type && !['masuk', 'keluar', 'semua'].includes(type)) where.movementType = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); where.createdAt.gte = s; }
      if (endDate)   { const e = new Date(endDate);   e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: { menuItem: { include: { category: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const normalized = movements.map(m => ({
      ...m,
      itemName: m.menuItem?.name || 'Unknown',
      categoryName: m.menuItem?.category?.name || '-',
      type: m.quantityChange > 0 ? 'masuk' : 'keluar',
      quantity: Math.abs(m.quantityChange),
      unit: 'unit',
      notes: m.reason || ''
    }));

    res.json(normalized);
  } catch (error) {
    console.error('❌ Get movements error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Also expose /api/inventory/logs for StockReportsPage compatibility
app.get('/api/inventory/logs', authenticateToken, async (req, res) => {
  try {
    const { startDate, limit } = req.query;
    const where = {};

    if (startDate) {
      const s = new Date(startDate);
      where.createdAt = { gte: s };
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: { menuItem: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 200
    });

    const normalized = movements.map(m => ({
      id: m.id,
      createdAt: m.createdAt,
      itemName: m.menuItem?.name || 'Unknown',
      quantity: Math.abs(m.quantityChange),
      type: m.quantityChange > 0 ? 'MASUK' : 'KELUAR',
      note: m.reason || '',
      unit: 'unit'
    }));

    res.json(normalized);
  } catch (error) {
    console.error('❌ Get logs error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/inventory/movements', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, type, quantity, movementType, reason } = req.body;

    if (!menuItemId || !type || !quantity)
      return res.status(400).json({ message: 'menuItemId, type, and quantity are required' });
    if (!['masuk', 'keluar'].includes(type))
      return res.status(400).json({ message: 'type must be "masuk" or "keluar"' });

    const item = await prisma.menuItem.findUnique({ where: { id: parseInt(menuItemId) } });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const qty = parseInt(quantity);
    if (type === 'keluar' && item.stock < qty)
      return res.status(400).json({ message: `Insufficient stock. Available: ${item.stock}` });

    const quantityChange = type === 'masuk' ? qty : -qty;
    const resolvedMovementType = movementType || (type === 'masuk' ? 'IN' : 'OUT');

    await prisma.menuItem.update({
      where: { id: parseInt(menuItemId) },
      data: { stock: item.stock + quantityChange }
    });

    const movement = await prisma.inventoryMovement.create({
      data: {
        menuItemId: parseInt(menuItemId),
        quantityChange,
        movementType: resolvedMovementType,
        reason: reason || null,
        ...(req.body.createdAt ? { createdAt: new Date(req.body.createdAt) } : {})
      },
      include: { menuItem: { include: { category: true } } }
    });

    res.status(201).json({ ...movement, itemName: movement.menuItem?.name, type, quantity: qty });
  } catch (error) {
    console.error('❌ Create movement error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/inventory/movements/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); where.createdAt.gte = s; }
      if (endDate)   { const e = new Date(endDate);   e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }

    const movements = await prisma.inventoryMovement.findMany({ where });
    const totalMasuk  = movements.filter(m => m.quantityChange > 0).length;
    const totalKeluar = movements.filter(m => m.quantityChange < 0).length;
    const totalLog    = movements.length;

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const aktivitasHariIni = await prisma.inventoryMovement.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    });

    res.json({ totalMasuk, totalKeluar, totalLog, aktivitasHariIni });
  } catch (error) {
    console.error('❌ Movements summary error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// MENU ROUTES (alias for inventory, used by CategorySection)
// ═══════════════════════════════════════════════════════════════

app.get('/api/menu', authenticateToken, async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error('❌ Get menu error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SUPPLIER ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/api/supplier', authenticateToken, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { transactions: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/supplier', authenticateToken, async (req, res) => {
  try {
    const { name, companyName, category, phone, email, address, city, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const supplier = await prisma.supplier.create({
      data: { name, companyName, category, phone, email, address, city, status: status || 'Aktif' }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/supplier/:id', authenticateToken, async (req, res) => {
  try {
    const { name, companyName, category, phone, email, address, city, status } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { name, companyName, category, phone, email, address, city, status }
    });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/supplier/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.supplierTransaction.deleteMany({ where: { supplierId: id } });
    await prisma.supplier.delete({ where: { id } });
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n── Auth ──────────────────────────────────────────`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  POST   /api/seed-users`);
  console.log(`  GET    /api/check-users`);
  console.log(`\n── Inventory ─────────────────────────────────────`);
  console.log(`  GET    /api/inventory`);
  console.log(`  GET    /api/inventory/summary`);
  console.log(`  GET    /api/inventory/weekly-trend`);
  console.log(`  GET    /api/inventory/top-used`);
  console.log(`  GET    /api/inventory/logs`);
  console.log(`  POST   /api/inventory`);
  console.log(`  PUT    /api/inventory/:id`);
  console.log(`  DELETE /api/inventory/:id`);
  console.log(`\n── Movements ─────────────────────────────────────`);
  console.log(`  GET    /api/inventory/movements`);
  console.log(`  GET    /api/inventory/movements/summary`);
  console.log(`  POST   /api/inventory/movements`);
  console.log(`\n── Kategori ──────────────────────────────────────`);
  console.log(`  GET    /api/kategori`);
  console.log(`  POST   /api/kategori`);
  console.log(`  PUT    /api/kategori/:id`);
  console.log(`  DELETE /api/kategori/:id`);
  console.log(`\n── Menu ──────────────────────────────────────────`);
  console.log(`  GET    /api/menu`);
  console.log(`\n── Supplier ──────────────────────────────────────`);
  console.log(`  GET    /api/supplier`);
  console.log(`  POST   /api/supplier`);
  console.log(`  PUT    /api/supplier/:id`);
  console.log(`  DELETE /api/supplier/:id`);
});
