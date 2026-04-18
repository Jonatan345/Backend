require('dotenv').config();
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const neon = new PrismaNeon({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter: neon });

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

// ========== KATEGORI ENDPOINTS ==========


// GET semua kategori
app.get('/api/kategori', authenticateToken, async (req, res) => {
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
app.post('/api/kategori', authenticateToken, async (req, res) => {
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

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
  res.send('Bima Resto Unified Backend API is Running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server Terkonsolidasi Berjalan!`);
  console.log(`Alamat: http://localhost:${PORT}`);
  console.log(`Database: Neon Cloud (PostgreSQL)`);
  console.log(`Endpoint Inventory: http://localhost:${PORT}/api/inventory/movements`);
});
