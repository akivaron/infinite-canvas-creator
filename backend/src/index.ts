import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRoutes from './routes/agent.js';
import advancedRoutes from './routes/advanced.js';
import ragRoutes from './routes/rag.js';
import projectsRoutes from './routes/projects.js';
import { embeddingService } from './services/embeddingService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

embeddingService.initialize().catch(console.error);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agent', agentRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/projects', projectsRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`\n✓ Backend Server Running on Port ${PORT}\n`);
  console.log('API Endpoints:');
  console.log(`  ✓ Health Check:    http://localhost:${PORT}/health`);
  console.log(`  ✓ Agent API:       http://localhost:${PORT}/api/agent`);
  console.log(`  ✓ RAG API:         http://localhost:${PORT}/api/rag`);
  console.log(`  ✓ Projects API:    http://localhost:${PORT}/api/projects`);
  console.log(`  ✓ Advanced API:    http://localhost:${PORT}/api/advanced`);
  console.log('\nCore Features:');
  console.log('  • OpenRouter integration (backend proxy)');
  console.log('  • RAG with pgvector embeddings');
  console.log('  • Semantic code & canvas search');
  console.log('  • Canvas node persistence & indexing');
  console.log('  • Project management with versioning');
  console.log('  • Real-time collaboration support');
  console.log('  • Export/Import functionality');
  console.log('  • Context-aware code generation');
  console.log('  • Multi-file refactoring');
  console.log('  • Conversation memory & learning');
  console.log('  • Terminal command execution\n');
});

export default app;
