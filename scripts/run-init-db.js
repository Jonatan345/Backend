const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs').promises;

async function initDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'sslmode=require',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = await fs.readFile('init_db.sql', 'utf8');
    
    // Split by ; and execute each statement
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    await client.query('BEGIN');
    
    for (const statement of statements) {
      try {
        await client.query(statement);
        console.log('Executed:', statement.split('\n')[0].trim().slice(0,50) + '...');
      } catch (err) {
        console.error('SQL error:', err.message);
        throw err;
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Database initialized successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Init failed:', error.message);
  } finally {
    await client.end();
  }
}

initDb().catch(console.error);