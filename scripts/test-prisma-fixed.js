require('dotenv').config();
const prisma = require('../prisma/client');

async function testLoginQuery() {
  console.log('Testing Prisma user.findUnique...');
  console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL ? 'YES' : 'NO');

  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    console.log('✅ User found:', {
      id: user?.id,
      username: user?.username,
      role: user?.role,
      hasPassword: !!user?.password,
      hasResetToken: !!user?.resetToken,
      hasResetExpiry: !!user?.resetTokenExpiry
    });

    if (user) {
      console.log('Login query works!');
    } else {
      console.log('No user found');
    }
  } catch (err) {
    console.error('❌ Prisma error:', err.code || err.message);
    console.error('Full error:', err);
  }
}

testLoginQuery().catch(console.error);
