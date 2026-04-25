const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany();
  
  console.log('\n📋 Current users in database:');
  console.log('===========================');
  
  users.forEach(user => {
    console.log(`Username: ${user.username}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password (first 20 chars): ${user.password.substring(0, 20)}...`);
    console.log(`Is hashed: ${user.password.startsWith('$2') ? 'YES (bcrypt)' : 'NO (plain text)'}`);
    console.log('---------------------------');
  });
  
  if (users.length === 0) {
    console.log('❌ No users found! Run setup script.');
  }
}

checkUsers()
  .finally(() => prisma.$disconnect());
