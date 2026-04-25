const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const users = [
  {
    username: 'admin',
    name: 'Admin',
    email: 'admin@bimaresto.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    username: 'manager',
    name: 'Manager',
    email: 'manager@bimaresto.com',
    password: 'manager123',
    role: 'manager',
  },
  {
    username: 'staff',
    name: 'Staff',
    email: 'staff@bimaresto.com',
    password: 'staff123',
    role: 'staff',
  },
];

async function setupUsers() {
  console.log('🔧 Setting up users...\n');

  for (const userData of users) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await prisma.user.upsert({
        where: { username: userData.username },
        update: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
        },
        create: {
          username: userData.username,
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
        },
      });

      console.log(`✅ User "${user.username}" upserted successfully`);
    } catch (err) {
      console.error(`❌ Error creating ${userData.username}:`, err.message);
    }
  }

  console.log('\n✅ Done! Run check-users.js to verify.');
}

setupUsers().finally(() => prisma.$disconnect());
