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
const { ensureDefaultTestUser } = require('./services/defaultUser.service');
const initializeSocket = require('./socket');

validateEnv();

const app = express();
const httpServer = http.createServer(app);

const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const explicitAllowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

const isPrivateLanHost = (host) => {
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  const m = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (m) {
    const second = Number(m[1]);
    return second >= 16 && second <= 31;
  }
  return false;
};

const isAllowedOrigin = (origin) => {
  // Allow non-browser tools (no Origin header).
  if (!origin) return true;
  if (explicitAllowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    return isPrivateLanHost(url.hostname);
  } catch {
    return false;
  }
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('CORS_NOT_ALLOWED'));
    },
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
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('CORS_NOT_ALLOWED'));
  },
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
  .then(async () => {
    await ensureDefaultTestUser();
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
