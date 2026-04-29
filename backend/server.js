import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './db.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import forecastRoutes from './routes/forecastRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import { protect } from './middleware/auth.js';
import { validateEnv } from './middleware/validateEnv.js';
import logger from './services/logger.js';

dotenv.config();

// Validate environment variables before anything else
validateEnv();

// Initialize Database
connectDB();

const app = express();

// Security: Add Helmet middleware for security headers
app.use(helmet());

// Response compression
app.use(compression());

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
app.use('/api/shipments', shipmentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/alerts', alertRoutes);

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
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  
  logger.error('Unhandled error', {
    status,
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  res.status(status).json({
    message: err.message || 'Internal server error',
    status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
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
  logger.info(`WebSocket client connected: ${socket.id}, User: ${socket.userId}`);

  // Stock updates (existing)
  socket.on('stock-update', (data) => {
    // Only broadcast to other clients (not the sender)
    socket.broadcast.emit('stock-changed', data);
  });

  // Shipment tracking
  socket.on('join-shipment', (shipmentId) => {
    socket.join(`shipment-${shipmentId}`);
    logger.info(`User ${socket.userId} joined shipment room: ${shipmentId}`);
  });

  socket.on('leave-shipment', (shipmentId) => {
    socket.leave(`shipment-${shipmentId}`);
    logger.info(`User ${socket.userId} left shipment room: ${shipmentId}`);
  });

  // Warehouse activity monitoring
  socket.on('join-warehouse', (warehouseId) => {
    socket.join(`warehouse-${warehouseId}`);
    logger.info(`User ${socket.userId} joined warehouse room: ${warehouseId}`);
  });

  socket.on('leave-warehouse', (warehouseId) => {
    socket.leave(`warehouse-${warehouseId}`);
    logger.info(`User ${socket.userId} left warehouse room: ${warehouseId}`);
  });

  // Alert notifications
  socket.on('subscribe-alerts', (filters) => {
    const roomName = `alerts-${socket.userId}`;
    socket.join(roomName);
    logger.info(`User ${socket.userId} subscribed to alerts`);
  });

  socket.on('unsubscribe-alerts', () => {
    const roomName = `alerts-${socket.userId}`;
    socket.leave(roomName);
    logger.info(`User ${socket.userId} unsubscribed from alerts`);
  });

  // Batch monitoring
  socket.on('join-batch', (batchId) => {
    socket.join(`batch-${batchId}`);
    logger.info(`User ${socket.userId} joined batch room: ${batchId}`);
  });

  socket.on('leave-batch', (batchId) => {
    socket.leave(`batch-${batchId}`);
    logger.info(`User ${socket.userId} left batch room: ${batchId}`);
  });

  // Real-time dashboard updates
  socket.on('join-dashboard', () => {
    socket.join('dashboard');
    logger.info(`User ${socket.userId} joined dashboard room`);
  });

  socket.on('leave-dashboard', () => {
    socket.leave('dashboard');
    logger.info(`User ${socket.userId} left dashboard room`);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Helper function to emit shipment updates
global.emitShipmentUpdate = (shipmentId, updateData) => {
  io.to(`shipment-${shipmentId}`).emit('shipment-update', updateData);
  io.to('dashboard').emit('dashboard-update', {
    type: 'SHIPMENT_UPDATE',
    shipmentId,
    data: updateData
  });
};

// Helper function to emit alert notifications
global.emitAlert = (userId, alertData) => {
  io.to(`alerts-${userId}`).emit('new-alert', alertData);
  io.to('dashboard').emit('dashboard-update', {
    type: 'NEW_ALERT',
    data: alertData
  });
};

// Helper function to emit warehouse activity
global.emitWarehouseActivity = (warehouseId, activityData) => {
  io.to(`warehouse-${warehouseId}`).emit('warehouse-activity', activityData);
  io.to('dashboard').emit('dashboard-update', {
    type: 'WAREHOUSE_ACTIVITY',
    warehouseId,
    data: activityData
  });
};

// Helper function to emit batch updates
global.emitBatchUpdate = (batchId, updateData) => {
  io.to(`batch-${batchId}`).emit('batch-update', updateData);
  io.to('dashboard').emit('dashboard-update', {
    type: 'BATCH_UPDATE',
    batchId,
    data: updateData
  });
};

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════╗
║    SERVER STARTED SUCCESSFULLY         ║
╠════════════════════════════════════════╣
║ Port: ${PORT}
║ Environment: ${process.env.NODE_ENV}
║ Time: ${new Date().toISOString()}
╚════════════════════════════════════════╝
  `);
});
