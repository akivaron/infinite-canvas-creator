import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRoutes from './routes/agent.js';
import advancedRoutes from './routes/advanced.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agent', agentRoutes);
app.use('/api/advanced', advancedRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`✓ Agent backend running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Agent API: http://localhost:${PORT}/api/agent`);
  console.log(`✓ Advanced API: http://localhost:${PORT}/api/advanced`);
  console.log('\nFeatures:');
  console.log('  - Context-aware code generation');
  console.log('  - AST analysis & symbol resolution');
  console.log('  - Multi-file refactoring');
  console.log('  - Code search & navigation');
  console.log('  - Change detection & impact analysis');
  console.log('  - Conversation memory & learning');
  console.log('  - Terminal command execution');
});

export default app;
