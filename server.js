require('dotenv').config();
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('@neondatabase/serverless');
const { neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'bima-resto-secret-key-2024';

app.use(cors());
app.use(express.json());

// Middleware untuk verifikasi JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ========== AUTHENTICATION ENDPOINTS ==========

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('🔐 Login attempt:', username);

  try {
    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username }
    });
    console.log('DB query result:', !!user);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('💥 Login ERROR details:', {
      code: err.code,
      message: err.message,
      stack: err.stack?.split('\\n')[0]
    });
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/register (untuk admin atau setup awal)
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, role = 'staff' } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
});

// GET /api/auth/me - Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { username, email } = req.body;

  try {
    // Find user by username or email
    const whereClause = username ? { username } : { email };
    const user = await prisma.user.findFirst({
      where: whereClause
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token (JWT with 1h expiry)
    const resetToken = jwt.sign(
      { id: user.id, type: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update user with reset token and expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1h from now
      }
    });

    // In production, send email here. For now, return token to frontend
    res.json({ 
      message: 'Reset token generated. Check your email or use this token.',
      token: resetToken,
      expiresIn: '1 hour'
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    // Verify reset token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry || 
        new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== KATEGORI ENDPOINTS (FULL CRUD) ==========

// Helper: tentukan badge type dari nama kategori
function getBadgeFromName(name) {
  const n = name.toLowerCase();
  if (n.includes('fresh') || n.includes('meat') || n.includes('poultry') || n.includes('vegetable') || n.includes('fruit') || n.includes('seafood')) {
    return 'FRESH INGREDIENTS';
  }
  if (n.includes('dry')) return 'DRY INGREDIENTS';
  if (n.includes('bottle') || n.includes('can')) return 'BOTTLE/CAN';
  if (n.includes('pastry')) return 'PASTRY';
  return 'GENERAL';
}

// Helper: tentukan low stock threshold berdasarkan nama kategori
function getLowStockThreshold(name) {
  const n = name.toLowerCase();
  
  // Makanan, Minuman, Dessert
  if (n.includes('makanan')) return 10;
  if (n.includes('minuman')) return 10;
  if (n.includes('dessert')) return 10;
  
  // Fresh Ingredients
  if (n.includes('meat')) return 10; // 10kg
  if (n.includes('poultry')) return 5; // 5kg
  if (n.includes('vegetable')) return 10; // 10kg
  if (n.includes('fruit')) return 5; // 5kg
  if (n.includes('seafood')) return 10; // 10kg
  
  // Dry Ingredients, Bottle, Pastry
  if (n.includes('dry')) return 10; // 10kg
  if (n.includes('bottle')) return 5; // 5 litres
  if (n.includes('pastry')) return 10; // 10kg
  
  return 10; // default
}

// GET semua kategori + statistik item (dengan threshold dinamis)
app.get('/api/kategori', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: {
        menuItems: {
          select: { 
            id: true, 
            name: true,
            stock: true, 
            status: true,
            price: true,
            estimatedTime: true
          }
        }
      }
    });

    // Hitung statistik per kategori dengan threshold yang sesuai
    const categoriesWithStats = categories.map(cat => {
      const threshold = getLowStockThreshold(cat.name);
      const totalItems = cat.menuItems.length;
      
      // Hitung low stock berdasarkan threshold per kategori
      const lowStock = cat.menuItems.filter(m => m.stock <= threshold).length;
      const available = cat.menuItems.filter(m => m.stock > threshold).length;
      
      // Hitung total stok untuk display
      const totalStock = cat.menuItems.reduce((sum, m) => sum + m.stock, 0);
      
      return {
        id: cat.id,
        name: cat.name,
        totalItems,
        lowStock,
        available,
        totalStock,
        threshold, // kirim threshold ke frontend untuk referensi
        badge: getBadgeFromName(cat.name),
        menuItems: cat.menuItems // kirim detail items jika diperlukan
      };
    });

    res.json(categoriesWithStats);
  } catch (err) {
    console.error('Error Database:', err.message);
    res.status(500).send('Server Error pada Kategori: ' + err.message);
  }
});

// GET kategori by ID
app.get('/api/kategori/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        menuItems: {
          select: { id: true, name: true, stock: true, status: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    res.json(category);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// POST kategori baru
app.post('/api/kategori', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  }

  try {
    const newCategory = await prisma.category.create({
      data: { name: name.trim() }
    });
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Nama kategori sudah ada' });
    }
    res.status(500).send('Gagal menambah kategori');
  }
});

// PUT update kategori
app.put('/api/kategori/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  }

  try {
    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name: name.trim() }
    });
    res.json(updatedCategory);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Nama kategori sudah ada' });
    }
    res.status(500).send('Gagal mengupdate kategori');
  }
});

// DELETE kategori
app.delete('/api/kategori/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Tidak dapat menghapus kategori yang memiliki menu items' });
    }
    res.status(500).send('Gagal menghapus kategori');
  }
});

// ========== MENU ITEMS ENDPOINTS ==========

// GET semua kategori + statistik item (dengan threshold dinamis)
app.get('/api/kategori', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: {
        menuItems: {
          select: { 
            id: true, 
            name: true,
            stock: true, 
            status: true,
            price: true,
            estimatedTime: true
          }
        }
      }
    });

    // Pastikan selalu return array, bahkan jika kosong
    if (!Array.isArray(categories)) {
      return res.json([]);
    }

    // Hitung statistik per kategori dengan threshold yang sesuai
    const categoriesWithStats = categories.map(cat => {
      const threshold = getLowStockThreshold(cat.name);
      const menuItems = cat.menuItems || []; // fallback jika undefined
      const totalItems = menuItems.length;
      
      // Hitung low stock berdasarkan threshold per kategori
      const lowStock = menuItems.filter(m => (m.stock || 0) <= threshold).length;
      const available = menuItems.filter(m => (m.stock || 0) > threshold).length;
      
      // Hitung total stok untuk display
      const totalStock = menuItems.reduce((sum, m) => sum + (m.stock || 0), 0);
      
      return {
        id: cat.id,
        name: cat.name,
        totalItems,
        lowStock,
        available,
        totalStock,
        threshold,
        badge: getBadgeFromName(cat.name),
        menuItems: menuItems.map(item => ({
          id: item.id,
          name: item.name,
          stock: item.stock || 0,
          status: item.status || 'Unknown',
          price: item.price || 0,
          estimatedTime: item.estimatedTime || '-'
        }))
      };
    });

    res.json(categoriesWithStats);
  } catch (err) {
    console.error('Error Database:', err.message);
    // Return empty array on error instead of crashing
    res.status(500).json({ error: 'Server Error pada Kategori: ' + err.message, categories: [] });
  }
});

// GET semua menu items dengan kategori
app.get('/api/menu', authenticateToken, async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      include: {
        category: true
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
app.post('/api/menu', authenticateToken, async (req, res) => {
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
app.get('/api/inventory/movements', authenticateToken, async (req, res) => {
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

// POST inventory movement + auto update stok (pakai transaction)
app.post('/api/inventory/movements', async (req, res) => {
  const { menuItemId, quantityChange, movementType, reason } = req.body;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: { menuItemId, quantityChange, movementType, reason }
      });

      await tx.menuItem.update({
        where: { id: menuItemId },
        data: {
          stock: {
            increment: quantityChange
          }
        }
      });

      return movement;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error Inventory:', err.message);
    res.status(500).send('Gagal memperbarui stok: ' + err.message);
  }
});

// ========== SUPPLIER MANAGEMENT ENDPOINTS ==========

app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } });
    const suppliersWithStats = await Promise.all(suppliers.map(async (supplier) => {
      const transactions = await prisma.supplierTransaction.findMany({ where: { supplierId: supplier.id } });
      return { ...supplier, totalTransactions: transactions.length, totalAmount: transactions.reduce((s,t) => s + Number(t.amount), 0) };
    }));
    res.json(suppliersWithStats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/suppliers', authenticateToken, async (req, res) => {
  const { name, companyName, category, phone, email, address, city, status } = req.body;
  try {
    const newSupplier = await prisma.supplier.create({ data: { name, companyName, category, phone, email, address: address || '', city: city || '', status: status || 'Aktif' } });
    res.status(201).json(newSupplier);
  } catch (err) { res.status(500).json({ error: 'Gagal menambah supplier' }); }
});

// ========== SUPPLIER TRANSACTIONS ENDPOINTS ==========

app.get('/api/suppliers/transactions/all', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.supplierTransaction.findMany({ include: { supplier: { select: { name: true, companyName: true } }, menuItem: { select: { name: true } } }, orderBy: { transactionDate: 'desc' } });
    res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/suppliers/transactions/create', authenticateToken, async (req, res) => {
  const { supplierId, menuItemId, transactionType, quantity, amount, status = 'Pending', notes } = req.body;
  try {
    const transaction = await prisma.supplierTransaction.create({ data: { supplierId: parseInt(supplierId), menuItemId: menuItemId ? parseInt(menuItemId) : null, transactionType, quantity: parseInt(quantity), amount: parseFloat(amount), status, notes: notes || null } });
    res.status(201).json(transaction);
  } catch (err) { res.status(500).json({ error: 'Gagal membuat transaksi' }); }
});

// ========== DASHBOARD STATS ==========

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalSuppliers = await prisma.supplier.count();
    const totalTransactions = await prisma.supplierTransaction.count();
    const totalAmount = await prisma.supplierTransaction.aggregate({ _sum: { amount: true }, where: { status: 'Completed' } });
    res.json({ totalSuppliers, totalTransactions, totalAmount: totalAmount._sum.amount || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
  res.send('Bima Resto Unified Backend API is Running...');
});

// ========== CHART / DASHBOARD DATA ENDPOINTS ==========

// GET /api/dashboard/weekly-trend - Data for weekly usage graph
app.get('/api/dashboard/weekly-trend', authenticateToken, async (req, res) => {
  try {
    // Get ALL inventory movements (your init_db.sql data is historical)
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        menuItem: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by day of week (simulate weekly pattern from your data)
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    
    // Distribute your existing data across days for visualization
    // Since your data is initial stock (all IN), we'll create a realistic pattern
    const totalMasuk = movements
      .filter(m => m.quantityChange > 0)
      .reduce((sum, m) => sum + m.quantityChange, 0);
    
    const totalKeluar = movements
      .filter(m => m.quantityChange < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

    // Create realistic weekly distribution based on your actual totals
    const weeklyData = days.map((day, index) => {
      // Simulate: more activity on weekdays, less on weekends
      const activityMultiplier = index < 5 ? 1.2 : 0.6;
      const dayMasuk = Math.round((totalMasuk / 7) * activityMultiplier);
      const dayKeluar = Math.round((totalKeluar / 7) * activityMultiplier);
      
      return {
        day,
        masuk: dayMasuk,
        keluar: dayKeluar || Math.round(dayMasuk * 0.3), // If no keluar, estimate 30% usage
        total: Math.round((dayMasuk + (dayKeluar || 0)) / 10)
      };
    });

    res.json(weeklyData);
  } catch (err) {
    console.error('Weekly trend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/top-usage - Top materials by usage (from your actual data)
app.get('/api/dashboard/top-usage', authenticateToken, async (req, res) => {
  try {
    // Get all inventory movements with menu items
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        menuItem: {
          select: { name: true, stock: true, category: { select: { name: true } } }
        }
      }
    });

    // Group by menu item and sum quantities
    const usageMap = new Map();
    
    movements.forEach(m => {
      if (!m.menuItem) return;
      const name = m.menuItem.name;
      const qty = Math.abs(m.quantityChange);
      
      if (!usageMap.has(name)) {
        usageMap.set(name, { 
          name, 
          totalUsed: 0, 
          stock: m.menuItem.stock,
          category: m.menuItem.category?.name || 'Unknown'
        });
      }
      const current = usageMap.get(name);
      current.totalUsed += qty;
    });

    // Sort by total usage and take top 5
    const sorted = Array.from(usageMap.values())
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5);

    // Calculate percentages based on max
    const maxAmount = sorted[0]?.totalUsed || 1;
    
    const topUsage = sorted.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      amount: item.totalUsed,
      unit: getUnitForItem(item.name),
      percentage: Math.round((item.totalUsed / maxAmount) * 100),
      stock: item.stock
    }));

    res.json(topUsage);
  } catch (err) {
    console.error('Top usage error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/stats - Enhanced dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalItems = await prisma.menuItem.count();
    
    // Count low stock items using your thresholds
    const allItems = await prisma.menuItem.findMany({
      include: { category: true }
    });
    
    const lowStockItems = allItems.filter(item => {
      const threshold = getLowStockThreshold(item.category?.name || '');
      return item.stock <= threshold;
    }).length;

    // Total stock value (sum of all stock)
    const totalStock = allItems.reduce((sum, item) => sum + item.stock, 0);

    // Count total movements
    const totalMovements = await prisma.inventoryMovement.count();

    // Suppliers
    const totalSuppliers = await prisma.supplier.count();
    const totalTransactions = await prisma.supplierTransaction.count();

    res.json({
      totalItems,
      lowStockItems,
      dailyUsage: Math.round(totalStock * 0.05), // Estimate 5% daily usage
      totalStock,
      totalMovements,
      totalSuppliers,
      totalTransactions
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock-reports/usage - Usage data for stock reports (from actual movements)
app.get('/api/stock-reports/usage', authenticateToken, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Get all movements
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        menuItem: { 
          select: { 
            id: true,
            name: true,
            category: { select: { name: true } }
          } 
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Create daily aggregation from your data
    // Since your data has timestamps, we'll group by date
    const dateMap = new Map();
    
    movements.forEach(m => {
      const date = new Date(m.createdAt).toISOString().split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, masuk: 0, keluar: 0, items: [] });
      }
      const entry = dateMap.get(date);
      
      const qty = Math.abs(m.quantityChange);
      if (m.quantityChange > 0) {
        entry.masuk += qty;
      } else {
        entry.keluar += qty;
      }
      
      if (m.menuItem) {
        entry.items.push({
          name: m.menuItem.name,
          quantity: qty,
          type: m.quantityChange > 0 ? 'MASUK' : 'KELUAR',
          reason: m.reason || 'Inventory movement'
        });
      }
    });

    const usageData = Array.from(dateMap.values());
    
    // Calculate summary
    const totalMasuk = movements
      .filter(m => m.quantityChange > 0)
      .reduce((sum, m) => sum + m.quantityChange, 0);
    
    const totalKeluar = movements
      .filter(m => m.quantityChange < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

    res.json({
      usageData,
      summary: {
        totalMasuk,
        totalKeluar,
        netChange: totalMasuk - totalKeluar,
        totalLogs: movements.length
      },
      movements: movements.map(m => ({
        id: m.id,
        date: m.createdAt,
        itemName: m.menuItem?.name || 'Unknown',
        quantity: Math.abs(m.quantityChange),
        type: m.quantityChange > 0 ? 'MASUK' : 'KELUAR',
        reason: m.reason || 'Inventory movement',
        movementType: m.movementType
      }))
    });
  } catch (err) {
    console.error('Stock reports usage error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper function for units
function getUnitForItem(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('minyak') || n.includes('oil')) return 'Liter';
  if (n.includes('telur') || n.includes('egg')) return 'Rak';
  if (n.includes('teh') || n.includes('jus')) return 'Liter';
  return 'kg';
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server Terkonsolidasi Berjalan!`);
  console.log(`Alamat: http://localhost:${PORT}`);
  console.log(`Database: Neon Cloud (PostgreSQL)`);
  console.log(`Endpoint Inventory: http://localhost:${PORT}/api/inventory/movements`);
  console.log(`Endpoint Suppliers: http://localhost:${PORT}/api/suppliers`);
  console.log(`Endpoint Supplier Transactions: http://localhost:${PORT}/api/suppliers/transactions/all`);
  console.log(`Endpoint Dashboard Stats: http://localhost:${PORT}/api/dashboard/stats`);
});
