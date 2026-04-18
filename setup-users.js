const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createUsersTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Users table created');

    // Insert sample users with bcrypt hashed passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    await client.query(`
      INSERT INTO users (username, email, password, role) VALUES
      ('admin', 'admin@bimaresto.com', $1, 'admin'),
      ('manager', 'manager@bimaresto.com', $2, 'manager'),
      ('staff', 'staff@bimaresto.com', $3, 'staff')
      ON CONFLICT (username) DO NOTHING;
    `, [adminHash, managerHash, staffHash]);

    console.log('Users inserted successfully!');
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

createUsersTable();