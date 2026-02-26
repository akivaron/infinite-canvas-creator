import express from 'express';
import db from '../config/database.js';

const router = express.Router();

interface DockerContainer {
  id: string;
  name: string;
  status: string;
  ports: number[];
}

class DeploymentManager {
  private containers: Map<string, DockerContainer> = new Map();

  async buildWebDeployment(deploymentId: string, projectId: string, config: any) {
    try {
      await this.updateDeploymentStatus(deploymentId, 'building', 'Building web deployment...');

      const projectResult = await db.query(
        'SELECT * FROM canvas_projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }

      const containerPort = this.getAvailablePort();
      const containerName = `web-${deploymentId}`;

      await this.simulateContainerBuild(deploymentId, containerName, containerPort);

      await this.updateDeploymentStatus(
        deploymentId,
        'running',
        'Deployment successful',
        containerName,
        containerPort
      );

      await this.initializeStorage(deploymentId);
      await this.startMetricsCollection(deploymentId);

      return { success: true, port: containerPort };
    } catch (error) {
      await this.updateDeploymentStatus(
        deploymentId,
        'failed',
        `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async buildApiDeployment(deploymentId: string, projectId: string, config: any) {
    try {
      await this.updateDeploymentStatus(deploymentId, 'building', 'Building API deployment...');

      const containerPort = this.getAvailablePort();
      const containerName = `api-${deploymentId}`;

      await this.simulateContainerBuild(deploymentId, containerName, containerPort);

      await this.updateDeploymentStatus(
        deploymentId,
        'running',
        'API deployment successful',
        containerName,
        containerPort
      );

      await this.initializeStorage(deploymentId);
      await this.startMetricsCollection(deploymentId);

      return { success: true, port: containerPort };
    } catch (error) {
      await this.updateDeploymentStatus(
        deploymentId,
        'failed',
        `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async buildDatabaseDeployment(deploymentId: string, config: any) {
    try {
      await this.updateDeploymentStatus(
        deploymentId,
        'building',
        'Creating isolated database...'
      );

      const containerPort = this.getAvailablePort();
      const containerName = `db-${deploymentId}`;

      await this.simulateContainerBuild(deploymentId, containerName, containerPort, 'postgres:15');

      await db.query(
        `UPDATE deployments SET environment = $1 WHERE id = $2`,
        [
          JSON.stringify({
            DB_HOST: 'localhost',
            DB_PORT: containerPort.toString(),
            DB_USER: 'postgres',
            DB_PASSWORD: this.generatePassword(),
            DB_NAME: `db_${deploymentId.replace(/-/g, '_')}`,
          }),
          deploymentId
        ]
      );

      await this.updateDeploymentStatus(
        deploymentId,
        'running',
        'Database deployment successful',
        containerName,
        containerPort
      );

      await this.initializeStorage(deploymentId);
      await this.startMetricsCollection(deploymentId);

      return { success: true, port: containerPort };
    } catch (error) {
      await this.updateDeploymentStatus(
        deploymentId,
        'failed',
        `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async stopDeployment(deploymentId: string) {
    try {
      const result = await db.query(
        'SELECT container_id FROM deployments WHERE id = $1',
        [deploymentId]
      );

      if (result.rows.length > 0 && result.rows[0].container_id) {
        this.containers.delete(result.rows[0].container_id);
      }

      await db.query(
        'UPDATE deployments SET status = $1, updated_at = NOW() WHERE id = $2',
        ['stopped', deploymentId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error stopping deployment:', error);
      throw error;
    }
  }

  private async simulateContainerBuild(
    deploymentId: string,
    containerName: string,
    port: number,
    image: string = 'node:18-alpine'
  ) {
    await this.sleep(2000);

    const container: DockerContainer = {
      id: containerName,
      name: containerName,
      status: 'running',
      ports: [port],
    };

    this.containers.set(containerName, container);

    await this.appendBuildLog(deploymentId, `Pulling image ${image}...`);
    await this.sleep(1000);
    await this.appendBuildLog(deploymentId, `Creating container ${containerName}...`);
    await this.sleep(500);
    await this.appendBuildLog(deploymentId, `Starting container on port ${port}...`);
    await this.sleep(500);
    await this.appendBuildLog(deploymentId, `Container started successfully`);
  }

  private async updateDeploymentStatus(
    deploymentId: string,
    status: string,
    logMessage?: string,
    containerId?: string,
    port?: number
  ) {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (containerId) updates.container_id = containerId;
    if (port) updates.port = port;
    if (status === 'running') updates.deployed_at = new Date().toISOString();

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    values.push(deploymentId);

    await db.query(
      `UPDATE deployments SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    if (logMessage) {
      await this.appendBuildLog(deploymentId, logMessage);
    }
  }

  private async appendBuildLog(deploymentId: string, message: string) {
    const result = await db.query(
      'SELECT build_logs FROM deployments WHERE id = $1',
      [deploymentId]
    );

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    const newLogs = (result.rows[0]?.build_logs || '') + logEntry;

    await db.query(
      'UPDATE deployments SET build_logs = $1 WHERE id = $2',
      [newLogs, deploymentId]
    );
  }

  private async initializeStorage(deploymentId: string) {
    const result = await db.query(
      'SELECT user_id FROM deployments WHERE id = $1',
      [deploymentId]
    );

    if (result.rows.length === 0) return;

    const userId = result.rows[0].user_id;
    const storageTypes = ['code', 'static', 'logs'];

    for (const type of storageTypes) {
      await db.query(
        `INSERT INTO deployment_storage (deployment_id, user_id, storage_type, size_bytes, file_count, last_calculated)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          deploymentId,
          userId,
          type,
          Math.floor(Math.random() * 10000000),
          Math.floor(Math.random() * 100)
        ]
      );
    }
  }

  private async startMetricsCollection(deploymentId: string) {
    setInterval(async () => {
      const result = await db.query(
        'SELECT status FROM deployments WHERE id = $1',
        [deploymentId]
      );

      if (result.rows.length === 0 || result.rows[0].status !== 'running') return;

      await db.query(
        `INSERT INTO deployment_metrics
         (deployment_id, timestamp, cpu_usage, memory_usage, bandwidth_in, bandwidth_out, requests_count, response_time_avg, error_count)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)`,
        [
          deploymentId,
          Math.random() * 50,
          Math.floor(Math.random() * 500000000),
          Math.floor(Math.random() * 1000000),
          Math.floor(Math.random() * 5000000),
          Math.floor(Math.random() * 100),
          Math.random() * 200,
          Math.floor(Math.random() * 5)
        ]
      );
    }, 60000);
  }

  private getAvailablePort(): number {
    return 3000 + Math.floor(Math.random() * 10000);
  }

  private generatePassword(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const deploymentManager = new DeploymentManager();

/**
 * @swagger
 * /api/deploy/build:
 *   post:
 *     summary: Build and deploy a project
 *     description: Creates a new deployment (web, api, or database) and starts the build process
 *     tags: [Deployment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deployment_id
 *               - deployment_type
 *             properties:
 *               deployment_id:
 *                 type: string
 *                 format: uuid
 *                 description: Unique deployment identifier
 *               deployment_type:
 *                 type: string
 *                 enum: [web, api, database]
 *                 description: Type of deployment
 *               project_id:
 *                 type: string
 *                 format: uuid
 *                 description: Project ID (required for web/api)
 *               config:
 *                 type: object
 *                 description: Deployment configuration
 *                 properties:
 *                   environment:
 *                     type: object
 *                     additionalProperties:
 *                       type: string
 *     responses:
 *       200:
 *         description: Deployment build started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 port:
 *                   type: integer
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Build failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/build', async (req, res) => {
  try {
    const { deployment_id, deployment_type, project_id, config } = req.body;

    if (!deployment_id || !deployment_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let result;
    switch (deployment_type) {
      case 'web':
        result = await deploymentManager.buildWebDeployment(
          deployment_id,
          project_id,
          config
        );
        break;
      case 'api':
        result = await deploymentManager.buildApiDeployment(
          deployment_id,
          project_id,
          config
        );
        break;
      case 'database':
        result = await deploymentManager.buildDatabaseDeployment(deployment_id, config);
        break;
      default:
        return res.status(400).json({ error: 'Invalid deployment type' });
    }

    res.json(result);
  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Build failed',
    });
  }
});

/**
 * @swagger
 * /api/deploy/stop:
 *   post:
 *     summary: Stop a running deployment
 *     description: Stops a deployment and its container
 *     tags: [Deployment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deployment_id
 *             properties:
 *               deployment_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Deployment stopped successfully
 *       400:
 *         description: Missing deployment_id
 *       500:
 *         description: Stop failed
 */
router.post('/stop', async (req, res) => {
  try {
    const { deployment_id } = req.body;

    if (!deployment_id) {
      return res.status(400).json({ error: 'Missing deployment_id' });
    }

    const result = await deploymentManager.stopDeployment(deployment_id);
    res.json(result);
  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Stop failed',
    });
  }
});

/**
 * @swagger
 * /api/deploy/health/{deployment_id}:
 *   get:
 *     summary: Check deployment health
 *     description: Returns the health status of a deployment
 *     tags: [Deployment]
 *     parameters:
 *       - in: path
 *         name: deployment_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Health status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 health:
 *                   type: string
 *                   enum: [healthy, unhealthy, unknown]
 *       404:
 *         description: Deployment not found
 */
router.get('/health/:deployment_id', async (req, res) => {
  try {
    const { deployment_id } = req.params;

    const result = await db.query(
      'SELECT status, health_status, container_id FROM deployments WHERE id = $1',
      [deployment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const deployment = result.rows[0];
    const health_status = deployment.status === 'running' ? 'healthy' : 'unhealthy';

    await db.query(
      'UPDATE deployments SET health_status = $1, last_health_check = NOW() WHERE id = $2',
      [health_status, deployment_id]
    );

    res.json({ status: deployment.status, health: health_status });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * @swagger
 * /api/deploy/calculate-storage:
 *   post:
 *     summary: Calculate deployment storage usage
 *     description: Returns total storage usage for a deployment
 *     tags: [Deployment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deployment_id
 *             properties:
 *               deployment_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Storage calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_bytes:
 *                   type: integer
 *                 storage:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post('/calculate-storage', async (req, res) => {
  try {
    const { deployment_id } = req.body;

    const result = await db.query(
      'SELECT * FROM deployment_storage WHERE deployment_id = $1',
      [deployment_id]
    );

    const total = result.rows.reduce((sum, s) => sum + (s.size_bytes || 0), 0);

    res.json({ total_bytes: total, storage: result.rows });
  } catch (error) {
    console.error('Calculate storage error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Calculation failed',
    });
  }
});

/** POST /api/deploy/subscriptions - body: { userId, planId, billingCycle } */
router.post('/subscriptions', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, planId, billingCycle = 'monthly' } = req.body;
    if (!userId || !planId) {
      return res.status(400).json({ error: 'userId and planId are required' });
    }
    const periodEnd = new Date(
      Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
    ).toISOString();
    await db.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, billing_cycle, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, 'active', $4, $5)`,
      [userId, planId, billingCycle, new Date().toISOString(), periodEnd]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    });
  }
});

/** POST /api/deploy/domains - body: { userId, deploymentId, domain } */
router.post('/domains', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, deploymentId, domain } = req.body;
    if (!userId || !deploymentId || !domain) {
      return res.status(400).json({ error: 'userId, deploymentId, and domain are required' });
    }
    const verificationToken = Math.random().toString(36).substring(7);
    await db.query(
      `INSERT INTO deployment_domains (deployment_id, user_id, domain, status, verification_token, dns_records)
       VALUES ($1, $2, $3, 'pending', $4, $5)`,
      [
        deploymentId,
        userId,
        domain,
        verificationToken,
        JSON.stringify([
          { type: 'A', name: '@', value: '0.0.0.0', ttl: 3600 },
          { type: 'CNAME', name: 'www', value: 'your-domain.com', ttl: 3600 },
        ]),
      ]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add domain error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add domain',
    });
  }
});

export default router;
