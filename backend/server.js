import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './db.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import { protect } from './middleware/auth.js';
import { validateEnv } from './middleware/validateEnv.js';

dotenv.config();

// Validate environment variables before anything else
validateEnv();

// Initialize Database
connectDB();

const app = express();

// Security: Add Helmet middleware for security headers
app.use(helmet());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Define allowed origins BEFORE using them
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:5173',
  'https://inventory-management-frontend.vercel.app'
];

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Socket.io injection
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/audit', auditRoutes);

// Analytics endpoint
app.get('/api/analytics/reorder-suggestions', protect, async (req, res) => {
  try {
    const products = await Product.find({ deletedAt: null });
    const sales = await Order.find({ 
      type: 'SALES', 
      status: 'COMPLETED',
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
        sku: p.sku,
        currentStock: p.stock,
        monthlyVelocity,
        suggestedReorder: p.stock < recommended ? Math.ceil(recommended - p.stock) : 0,
        lowStockThreshold: p.lowStockThreshold
      };
    }).filter(s => s.suggestedReorder > 0).sort((a, b) => b.suggestedReorder - a.suggestedReorder);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reorder suggestions', error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Socket.io connection handling with authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify token via middleware
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error(`Authentication error: ${error.message}`));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User:', socket.userId);
  
  socket.on('stock-update', (data) => {
    // Only broadcast to other clients (not the sender)
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
