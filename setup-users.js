const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupUsers() {
  const users = [
    { username: 'admin', password: 'admin123', name: 'Admin', role: 'Admin' },
    { username: 'manager', password: 'manager123', name: 'Manager', role: 'Manager' },
    { username: 'staff', password: 'staff123', name: 'Staff', role: 'Staff' },
  ];

  for (const userData of users) {
    // Hash password properly
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await prisma.user.upsert({
      where: { username: userData.username },
      update: {
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
      },
      create: {
        username: userData.username,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
      },
    });
    
    console.log(`✅ User ${userData.username} created/updated`);
  }

  console.log('\n🎉 All users setup complete!');
  console.log('Login credentials:');
  console.log('  admin / admin123');
  console.log('  manager / manager123');
  console.log('  staff / staff123');
}

setupUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
