import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.js';
import databaseRoutes from './routes/database.js';
import databaseNodesRoutes from './routes/database-nodes.js';
import agentRoutes from './routes/agent.js';
import advancedRoutes from './routes/advanced.js';
import ragRoutes from './routes/rag.js';
import projectsRoutes from './routes/projects.js';
import sandboxRoutes from './routes/sandbox.js';
import mobileRoutes from './routes/mobile.js';
import dbsandboxRoutes from './routes/dbsandbox.js';
import deployRoutes from './routes/deploy.js';
import domainsRoutes from './routes/domains.js';
import paymentsRoutes from './routes/payments.js';
import { embeddingService } from './services/embeddingService.js';
import { swaggerSpec } from './config/swagger.js';
import db from './config/database.js';
import { initializeWebSocket, getWebSocketManager } from './config/websocket.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, same-origin)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

embeddingService.initialize().catch(console.error);

db.testConnection().then((connected) => {
  if (!connected) {
    console.error('Failed to connect to PostgreSQL. Please check DATABASE_URL environment variable.');
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server health status and timestamp
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Canvas Platform API Documentation'
}));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

initializeWebSocket(server);

/**
 * @swagger
 * /api/ws/stats:
 *   get:
 *     summary: Get WebSocket connection statistics
 *     description: Returns real-time statistics about WebSocket connections
 *     tags: [WebSocket]
 *     responses:
 *       200:
 *         description: WebSocket statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalConnections:
 *                   type: integer
 *                   description: Total number of connections
 *                 activeConnections:
 *                   type: integer
 *                   description: Number of active open connections
 *                 clients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       sessionId:
 *                         type: string
 *                       isAlive:
 *                         type: boolean
 *                       state:
 *                         type: integer
 *                         description: WebSocket state (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)
 *       503:
 *         description: WebSocket not initialized
 */
app.get('/api/ws/stats', (req, res) => {
  const wsManager = getWebSocketManager();
  if (wsManager) {
    res.json(wsManager.getStats());
  } else {
    res.status(503).json({ error: 'WebSocket not initialized' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/database-nodes', databaseNodesRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/sandbox', sandboxRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/dbsandbox', dbsandboxRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/domains', domainsRoutes);
app.use('/api/payments', paymentsRoutes);

app.post('/api/db/query', async (req, res) => {
  try {
    const { sql, params = [] } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const result = await db.query(sql, params);

    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
    });
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: error.message || 'Database query failed',
    });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

server.listen(PORT, () => {
  console.log(`\n✓ Backend Server Running on Port ${PORT}\n`);
  console.log('API Documentation:');
  console.log(`  ✓ Swagger UI:      http://localhost:${PORT}/api-docs`);
  console.log(`  ✓ OpenAPI JSON:    http://localhost:${PORT}/api-docs.json`);
  console.log('\nWebSocket:');
  console.log(`  ✓ WebSocket URL:   ws://localhost:${PORT}/ws`);
  console.log(`  ✓ WS Stats:        http://localhost:${PORT}/api/ws/stats`);
  console.log('\nAPI Endpoints:');
  console.log(`  ✓ Health Check:    http://localhost:${PORT}/health`);
  console.log(`  ✓ Agent API:       http://localhost:${PORT}/api/agent`);
  console.log(`  ✓ RAG API:         http://localhost:${PORT}/api/rag`);
  console.log(`  ✓ Projects API:    http://localhost:${PORT}/api/projects`);
  console.log(`  ✓ Sandbox API:     http://localhost:${PORT}/api/sandbox`);
  console.log(`  ✓ Mobile API:      http://localhost:${PORT}/api/mobile`);
  console.log(`  ✓ DB Sandbox API:  http://localhost:${PORT}/api/dbsandbox`);
  console.log(`  ✓ Deploy API:      http://localhost:${PORT}/api/deploy`);
  console.log(`  ✓ Domains API:     http://localhost:${PORT}/api/domains`);
  console.log(`  ✓ Advanced API:    http://localhost:${PORT}/api/advanced`);
  console.log('\nCore Features:');
  console.log('  • WebSocket real-time notifications');
  console.log('  • PostgreSQL with connection pooling');
  console.log('  • OpenAPI/Swagger documentation');
  console.log('  • OpenRouter integration (backend proxy)');
  console.log('  • RAG with pgvector embeddings');
  console.log('  • Semantic code & canvas search');
  console.log('  • Canvas node persistence & indexing');
  console.log('  • Project management with versioning');
  console.log('  • Isolated sandbox execution environment');
  console.log('  • Mobile simulator with Expo support');
  console.log('  • Database sandbox per user');
  console.log('  • Deployment system with Docker containers');
  console.log('  • Real-time collaboration support');
  console.log('  • Export/Import functionality');
  console.log('  • Context-aware code generation');
  console.log('  • Multi-file refactoring');
  console.log('  • Conversation memory & learning');
  console.log('  • Terminal command execution\n');
});

export default app;
