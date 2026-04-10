const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { validateEnv } = require('./config/env');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const videoRoutes = require('./routes/video');
const initializeSocket = require('./socket');

validateEnv();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store io on app for access in controllers
app.set('io', io);

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static HLS / uploads ────────────────────────────────────
app.use('/hls', express.static(path.join(__dirname, process.env.HLS_DIR || 'uploads/hls'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  },
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/videos', videoRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── 404 / Error handlers ────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// ── Socket.IO ───────────────────────────────────────────────
initializeSocket(io);

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`\n🚀  visStream Server  →  http://localhost:${PORT}`);
      console.log(`📡  Socket.IO ready`);
      console.log(`🎬  HLS streaming enabled`);
      console.log(`🌍  Accepting connections from ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
    });
  })
  .catch((err) => {
    console.error('❌  Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = { io };
