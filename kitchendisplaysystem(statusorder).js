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