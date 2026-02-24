import { Router, Request, Response } from 'express';
import { sandboxExecutor } from '../services/sandboxExecutor.js';

const router = Router();

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId, projectId, resources } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const session = await sandboxExecutor.createSession(userId, projectId, resources);

    res.json({
      session: {
        id: session.id,
        status: session.status,
        workdir: session.workdir,
        expiresAt: session.expiresAt,
        resources: session.resources,
      },
    });
  } catch (error) {
    console.error('Create sandbox session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const sessions = await sandboxExecutor.getAllSessions(
      userId ? String(userId) : undefined
    );

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        projectId: s.projectId,
        status: s.status,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    console.error('List sandbox sessions error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await sandboxExecutor.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
      session: {
        id: session.id,
        userId: session.userId,
        projectId: session.projectId,
        status: session.status,
        workdir: session.workdir,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        resources: session.resources,
      },
    });
  } catch (error) {
    console.error('Get sandbox session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await sandboxExecutor.destroySession(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Destroy sandbox session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/extend', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { minutes = 30 } = req.body;

    await sandboxExecutor.extendSession(sessionId, minutes);

    res.json({ success: true });
  } catch (error) {
    console.error('Extend sandbox session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/files', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { path, content, encoding = 'utf8' } = req.body;

    if (!path || content === undefined) {
      return res.status(400).json({ error: 'path and content are required' });
    }

    await sandboxExecutor.writeFile(sessionId, path, content, encoding);

    res.json({ success: true });
  } catch (error) {
    console.error('Write file error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/files/batch', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { files } = req.body;

    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'files must be an array' });
    }

    await sandboxExecutor.writeFiles(sessionId, files);

    res.json({ success: true, count: files.length });
  } catch (error) {
    console.error('Write files batch error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions/:sessionId/files', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { path = '.', encoding = 'utf8' } = req.query;

    if (typeof path !== 'string') {
      return res.status(400).json({ error: 'path must be a string' });
    }

    if (path === '.' || path.endsWith('/')) {
      const files = await sandboxExecutor.listFiles(sessionId, path);
      res.json({ files });
    } else {
      const content = await sandboxExecutor.readFile(
        sessionId,
        path,
        encoding as 'utf8' | 'base64'
      );
      res.json({ path, content, encoding });
    }
  } catch (error) {
    console.error('Read file error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/execute', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { command, timeout, env, stdin } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'command is required' });
    }

    const result = await sandboxExecutor.executeCommand(sessionId, command, {
      timeout,
      env,
      stdin,
    });

    res.json({ result });
  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/install', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { packageManager = 'npm', packages } = req.body;

    if (!Array.isArray(packages) || packages.length === 0) {
      return res.status(400).json({ error: 'packages array is required' });
    }

    const result = await sandboxExecutor.installPackage(
      sessionId,
      packageManager,
      packages
    );

    res.json({ result });
  } catch (error) {
    console.error('Install package error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/run', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { script, packageManager = 'npm' } = req.body;

    if (!script) {
      return res.status(400).json({ error: 'script name is required' });
    }

    const result = await sandboxExecutor.runScript(sessionId, script, packageManager);

    res.json({ result });
  } catch (error) {
    console.error('Run script error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/server', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { command, port = 3000 } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'command is required' });
    }

    const server = await sandboxExecutor.startServer(sessionId, command, port);

    res.json({ server });
  } catch (error) {
    console.error('Start server error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions/:sessionId/stats', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const stats = await sandboxExecutor.getSessionStats(sessionId);

    res.json({ stats });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/git/init', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const result = await sandboxExecutor.executeCommand(sessionId, 'git init');

    res.json({ result });
  } catch (error) {
    console.error('Git init error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/git/commit', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'commit message is required' });
    }

    const addResult = await sandboxExecutor.executeCommand(sessionId, 'git add .');
    const commitResult = await sandboxExecutor.executeCommand(
      sessionId,
      `git commit -m "${message.replace(/"/g, '\\"')}"`
    );

    res.json({ result: commitResult });
  } catch (error) {
    console.error('Git commit error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions/:sessionId/git/log', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const result = await sandboxExecutor.executeCommand(
      sessionId,
      'git log --oneline -n 10'
    );

    res.json({ result });
  } catch (error) {
    console.error('Git log error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/test', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { framework = 'jest', testFile } = req.body;

    const commands: Record<string, string> = {
      jest: testFile ? `npm test -- ${testFile}` : 'npm test',
      vitest: testFile ? `npm run test -- ${testFile}` : 'npm run test',
      mocha: testFile ? `npm run test -- ${testFile}` : 'npm run test',
    };

    const command = commands[framework] || commands.jest;
    const result = await sandboxExecutor.executeCommand(sessionId, command, {
      timeout: 60000,
    });

    res.json({ result });
  } catch (error) {
    console.error('Run tests error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/build', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { buildCommand = 'npm run build' } = req.body;

    const result = await sandboxExecutor.executeCommand(sessionId, buildCommand, {
      timeout: 180000,
    });

    res.json({ result });
  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
