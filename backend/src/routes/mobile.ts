import { Router, Request, Response } from 'express';
import { mobileSimulator } from '../services/mobileSimulator.js';

const router = Router();

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId, projectId, config } = req.body;

    if (!userId || !config) {
      return res.status(400).json({ error: 'userId and config are required' });
    }

    const session = await mobileSimulator.createExpoSession(
      userId,
      projectId,
      config
    );

    res.json({
      session: {
        id: session.id,
        status: session.status,
        type: session.type,
        platform: session.platform,
        workdir: session.workdir,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Create mobile session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const sessions = await mobileSimulator.getAllSessions(
      userId ? String(userId) : undefined
    );

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        projectId: s.projectId,
        type: s.type,
        platform: s.platform,
        status: s.status,
        serverUrl: s.serverUrl,
        qrCode: s.qrCode,
        tunnelUrl: s.tunnelUrl,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    console.error('List mobile sessions error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await mobileSimulator.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
      session: {
        id: session.id,
        userId: session.userId,
        projectId: session.projectId,
        type: session.type,
        platform: session.platform,
        status: session.status,
        workdir: session.workdir,
        serverUrl: session.serverUrl,
        qrCode: session.qrCode,
        tunnelUrl: session.tunnelUrl,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get mobile session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await mobileSimulator.destroySession(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Destroy mobile session error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/files', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { files } = req.body;

    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'files must be an array' });
    }

    await mobileSimulator.writeProjectFiles(sessionId, files);

    res.json({ success: true, count: files.length });
  } catch (error) {
    console.error('Write mobile files error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/install', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { packageManager = 'npm' } = req.body;

    const result = await mobileSimulator.installDependencies(
      sessionId,
      packageManager
    );

    res.json({ result });
  } catch (error) {
    console.error('Install dependencies error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/start', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { platform = 'web', tunnel = false, lan = false } = req.body;

    const result = await mobileSimulator.startExpoServer(sessionId, {
      platform,
      tunnel,
      lan,
    });

    res.json({ server: result });
  } catch (error) {
    console.error('Start Expo server error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/stop', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await mobileSimulator.stopExpoServer(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Stop Expo server error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/build', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { platform, profile, local = false } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'platform is required' });
    }

    const result = await mobileSimulator.buildExpo(sessionId, platform, {
      profile,
      local,
    });

    res.json({ result });
  } catch (error) {
    console.error('Build Expo error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/sessions/:sessionId/export', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { platform = 'web' } = req.body;

    const outputDir = await mobileSimulator.exportExpo(sessionId, platform);

    res.json({ outputDir, success: true });
  } catch (error) {
    console.error('Export Expo error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/sessions/:sessionId/logs', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { lines = 100 } = req.query;

    const logs = await mobileSimulator.getSessionLogs(
      sessionId,
      parseInt(String(lines))
    );

    res.json({ logs });
  } catch (error) {
    console.error('Get session logs error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
