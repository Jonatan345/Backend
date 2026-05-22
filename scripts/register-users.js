const fetch = require('node-fetch');

async function registerUsers() {
  const users = [
    { username: 'admin', email: 'admin@bimaresto.com', password: 'admin123', role: 'admin' },
    { username: 'manager', email: 'manager@bimaresto.com', password: 'manager123', role: 'manager' },
    { username: 'staff', email: 'staff@bimaresto.com', password: 'staff123', role: 'staff' }
  ];

  for (const user of users) {
    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ User ${user.username} created successfully`);
      } else {
        console.log(`❌ Failed to create ${user.username}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.username}:`, error.message);
    }
  }
}

registerUsers();