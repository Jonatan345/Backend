const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugPassword() {
  try {
    console.log('🔍 === PASSWORD DEBUG ===\n');

    // Ambil user admin
    const user = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (!user) {
      console.log('❌ User admin tidak ditemukan!');
      return;
    }

    console.log('📦 User dari DB:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password hash: ${user.password}`);
    console.log(`   Password hash length: ${user.password.length}`);
    console.log('');

    // Test bcrypt compare dengan 'admin123'
    const testPassword = 'admin123';
    console.log(`🧪 Testing bcrypt.compare('${testPassword}', hash)...`);
    
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`   Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log('');

    // Hash 'admin123' baru dan bandingkan
    console.log(`🔐 Generate hash baru untuk '${testPassword}'...`);
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log(`   New hash: ${newHash}`);
    console.log('');

    // Test dengan hash baru
    const isNewMatch = await bcrypt.compare(testPassword, newHash);
    console.log(`   bcrypt.compare dengan hash baru: ${isNewMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPassword();
