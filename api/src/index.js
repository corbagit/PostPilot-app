import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import billingRoutes from './routes/billing.js';
import paypalRoutes from './routes/paypal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();

// ── Middleware ──────────────────────────────────────────

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Raw body parser for webhooks (must be registered before json parser)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use('/api/paypal/webhook', express.raw({ type: 'application/json' }));
// JSON body parser for all other routes
app.use(express.json());

// ── Serve Frontend & Brand Assets ─────────────────────
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Also serve brand from public/brand for /brand/* paths
const brandPath = path.join(publicPath, 'brand');
app.use('/brand', express.static(brandPath));

// ── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/paypal', paypalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PostPilot API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── SPA Fallback ────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({
        message: 'PostPilot API is running',
        docs: '/api/health',
        note: 'Frontend not built yet'
      });
    }
  });
});

// ── Start Server ───────────────────────────────────────

function start() {
  // Run migrations
  try {
    runMigrations();
  } catch (err) {
    console.error('[server] Migration error:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PostPilot API running on http://0.0.0.0:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[server] Shutting down gracefully...');
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();