import { Router, Request, Response } from 'express';
import { ragService } from '../services/ragService.js';
import { embeddingService } from '../services/embeddingService.js';

const router = Router();

router.post('/index/code', async (req: Request, res: Response) => {
  try {
    const { projectId, filePath, content, metadata } = req.body;

    if (!projectId || !filePath || !content) {
      return res.status(400).json({
        error: 'projectId, filePath, and content are required',
      });
    }

    await ragService.indexCode(projectId, filePath, content, metadata);

    res.json({ success: true, message: 'Code indexed successfully' });
  } catch (error) {
    console.error('Index code error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/index/code/batch', async (req: Request, res: Response) => {
  try {
    const { projectId, files } = req.body;

    if (!projectId || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: 'projectId and files array are required',
      });
    }

    await ragService.indexBatchCode(projectId, files);

    res.json({
      success: true,
      message: `Indexed ${files.length} files successfully`,
    });
  } catch (error) {
    console.error('Batch index error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/index/node', async (req: Request, res: Response) => {
  try {
    const { projectId, nodeId, nodeType, nodeData } = req.body;

    if (!projectId || !nodeId || !nodeType) {
      return res.status(400).json({
        error: 'projectId, nodeId, and nodeType are required',
      });
    }

    await ragService.indexCanvasNode(projectId, nodeId, nodeType, nodeData);

    res.json({ success: true, message: 'Canvas node indexed successfully' });
  } catch (error) {
    console.error('Index node error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/index/conversation', async (req: Request, res: Response) => {
  try {
    const { sessionId, turnId, prompt, response, metadata } = req.body;

    if (!sessionId || !turnId || !prompt) {
      return res.status(400).json({
        error: 'sessionId, turnId, and prompt are required',
      });
    }

    await ragService.indexConversationTurn(
      sessionId,
      turnId,
      prompt,
      response,
      metadata
    );

    res.json({ success: true, message: 'Conversation indexed successfully' });
  } catch (error) {
    console.error('Index conversation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/code', async (req: Request, res: Response) => {
  try {
    const { query, projectId, topK = 5, threshold = 0.7 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await ragService.searchCode(query, projectId, topK, threshold);

    res.json({ results });
  } catch (error) {
    console.error('Search code error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/nodes', async (req: Request, res: Response) => {
  try {
    const { query, projectId, topK = 5, threshold = 0.7 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await ragService.searchCanvasNodes(
      query,
      projectId,
      topK,
      threshold
    );

    res.json({ results });
  } catch (error) {
    console.error('Search nodes error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/conversations', async (req: Request, res: Response) => {
  try {
    const { query, sessionId, topK = 3, threshold = 0.7 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await ragService.searchConversations(
      query,
      sessionId,
      topK,
      threshold
    );

    res.json({ results });
  } catch (error) {
    console.error('Search conversations error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/context/build', async (req: Request, res: Response) => {
  try {
    const { query, projectId, sessionId, options } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const context = await ragService.buildRAGContext(
      query,
      projectId,
      sessionId,
      options
    );

    res.json({ context });
  } catch (error) {
    console.error('Build context error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, projectId, sessionId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const enhancedPrompt = await ragService.enhancePromptWithRAG(
      prompt,
      projectId,
      sessionId
    );

    res.json({ enhancedPrompt });
  } catch (error) {
    console.error('Enhance prompt error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/embedding/generate', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const embedding = await embeddingService.generateEmbedding(text);

    res.json({ embedding });
  } catch (error) {
    console.error('Generate embedding error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);

    await ragService.deleteProjectEmbeddings(projectId);

    res.json({
      success: true,
      message: 'Project embeddings deleted successfully',
    });
  } catch (error) {
    console.error('Delete project embeddings error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId);

    await ragService.deleteSessionEmbeddings(sessionId);

    res.json({
      success: true,
      message: 'Session embeddings deleted successfully',
    });
  } catch (error) {
    console.error('Delete session embeddings error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
