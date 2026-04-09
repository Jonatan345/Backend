const express = require('express');
const app = express();
app.use(express.json());

// Mock Database Bima Resto
let orders = [
    { id: 1, table: 5, items: ['Nasi Goreng Bima', 'Es Teh'], status: 'pending' },
    { id: 2, table: 3, items: ['Ayam Bakar', 'Jeruk Panas'], status: 'cooking' }
];

// Endpoint KDS: Mengambil semua pesanan yang belum selesai
app.get('/api/kds/orders', (req, res) => {
    const activeOrders = orders.filter(o => o.status !== 'completed');
    res.json({ success: true, data: activeOrders });
});

// Endpoint KDS: Memperbarui status pesanan (Pending -> Cooking -> Ready)
app.put('/api/kds/orders/:id/status', (req, res) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    const validStatuses = ['pending', 'cooking', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
        return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    }

    orders[orderIndex].status = status;
    res.json({ success: true, message: `Status pesanan ${orderId} diubah menjadi ${status}`, data: orders[orderIndex] });
});

app.listen(3000, () => console.log('Bima Resto Backend berjalan di port 3000'));

// Mock Database untuk Kategori & Menu
let categories = [
    { id: 1, name: 'Makanan Utama', description: 'Nasi, Mie, dll' },
    { id: 2, name: 'Minuman', description: 'Es, Kopi, Jus' },
    { id: 3, name: 'Camilan', description: 'Snack ringan' }
];

let menuItems = [
    { id: 1, category_id: 1, name: 'Nasi Goreng Bima', price: 25000, stock: 50 },
    { id: 2, category_id: 2, name: 'Es Teh Manis', price: 5000, stock: 100 }
];

// Endpoint 1: Mengambil semua kategori (Untuk ditampilkan di frontend)
app.get('/api/categories', (req, res) => {
    res.json({ success: true, data: categories });
});

// Endpoint 2: Menambahkan kategori baru (Dipanggil dari modal tambah kategori di frontend)
app.post('/api/categories', (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi' });
    }

    const newCategory = {
        id: categories.length + 1,
        name: name,
        description: description || ''
    };
    
    categories.push(newCategory);
    res.status(201).json({ success: true, message: 'Kategori berhasil ditambahkan', data: newCategory });
});

// Endpoint 3: Mengambil menu berdasarkan kategori (Untuk filter di halaman utama)
app.get('/api/menu', (req, res) => {
    const categoryId = req.query.categoryId;
    
    // Jika ada query ?categoryId=1, filter datanya
    if (categoryId) {
        const filteredMenu = menuItems.filter(item => item.category_id === parseInt(categoryId));
        return res.json({ success: true, data: filteredMenu });
    }
    
    // Jika tidak ada query, tampilkan semua
    res.json({ success: true, data: menuItems });
});

// ... (app.listen) ...
