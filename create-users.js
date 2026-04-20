const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function createUsers() {
  // Buat koneksi database langsung tanpa Prisma Client
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    console.log('Inserting users...');

    // Insert users
    await client.query(`
      INSERT INTO users (username, email, password, role)
      VALUES
        ('admin', 'admin@bimaresto.com', $1, 'admin'),
        ('manager', 'manager@bimaresto.com', $2, 'manager'),
        ('staff', 'staff@bimaresto.com', $3, 'staff')
      ON CONFLICT (username) DO NOTHING
    `, [adminPassword, managerPassword, staffPassword]);

    console.log('Users created successfully!');
    console.log('Demo credentials:');
    console.log('Admin: admin / admin123');
    console.log('Manager: manager / manager123');
    console.log('Staff: staff / staff123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createUsers();