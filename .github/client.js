const dotenv = require('dotenv');
dotenv.config();

const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL in environment. Add it to .env or set it before running the server.');
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
  log: ['query', 'info', 'warn', 'error'],
});

module.exports = prisma;
