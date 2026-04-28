import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './db.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import { protect } from './middleware/auth.js';

dotenv.config();

// Initialize Database
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io injection
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/warehouses', warehouseRoutes);

// Analytics endpoint
app.get('/api/analytics/reorder-suggestions', protect, async (req, res) => {
  try {
    const products = await Product.find({});
    const sales = await Order.find({ 
      type: 'SALES', 
      createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
    });
    
    const suggestions = products.map(p => {
      const pSales = sales.reduce((acc, o) => {
        const item = o.items.find(i => i.product.toString() === p._id.toString());
        return acc + (item ? item.quantity : 0);
      }, 0);
      
      const monthlyVelocity = pSales;
      const recommended = Math.max(monthlyVelocity * 1.5, p.lowStockThreshold * 2);
      
      return {
        productId: p._id,
        name: p.name,
        currentStock: p.stock,
        monthlyVelocity,
        suggestedReorder: p.stock < recommended ? Math.ceil(recommended - p.stock) : 0
      };
    }).filter(s => s.suggestedReorder > 0);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reorder suggestions', error: error.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('stock-update', (data) => {
    socket.broadcast.emit('stock-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
