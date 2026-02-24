import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

      const { data: project } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) {
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

      const { error: envError } = await supabase
        .from('deployments')
        .update({
          environment: {
            DB_HOST: 'localhost',
            DB_PORT: containerPort.toString(),
            DB_USER: 'postgres',
            DB_PASSWORD: this.generatePassword(),
            DB_NAME: `db_${deploymentId.replace(/-/g, '_')}`,
          },
        })
        .eq('id', deploymentId);

      if (envError) throw envError;

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
      const { data: deployment } = await supabase
        .from('deployments')
        .select('container_id')
        .eq('id', deploymentId)
        .single();

      if (deployment?.container_id) {
        this.containers.delete(deployment.container_id);
      }

      await supabase
        .from('deployments')
        .update({
          status: 'stopped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deploymentId);

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

    await supabase.from('deployments').update(updates).eq('id', deploymentId);

    if (logMessage) {
      await this.appendBuildLog(deploymentId, logMessage);
    }
  }

  private async appendBuildLog(deploymentId: string, message: string) {
    const { data: deployment } = await supabase
      .from('deployments')
      .select('build_logs')
      .eq('id', deploymentId)
      .single();

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    const newLogs = (deployment?.build_logs || '') + logEntry;

    await supabase
      .from('deployments')
      .update({ build_logs: newLogs })
      .eq('id', deploymentId);
  }

  private async initializeStorage(deploymentId: string) {
    const { data: deployment } = await supabase
      .from('deployments')
      .select('user_id')
      .eq('id', deploymentId)
      .single();

    if (!deployment) return;

    const storageTypes = ['code', 'static', 'logs'];

    for (const type of storageTypes) {
      await supabase.from('deployment_storage').insert({
        deployment_id: deploymentId,
        user_id: deployment.user_id,
        storage_type: type,
        size_bytes: Math.floor(Math.random() * 10000000),
        file_count: Math.floor(Math.random() * 100),
        last_calculated: new Date().toISOString(),
      });
    }
  }

  private async startMetricsCollection(deploymentId: string) {
    setInterval(async () => {
      const { data: deployment } = await supabase
        .from('deployments')
        .select('status')
        .eq('id', deploymentId)
        .single();

      if (deployment?.status !== 'running') return;

      await supabase.from('deployment_metrics').insert({
        deployment_id: deploymentId,
        timestamp: new Date().toISOString(),
        cpu_usage: Math.random() * 50,
        memory_usage: Math.floor(Math.random() * 500000000),
        bandwidth_in: Math.floor(Math.random() * 1000000),
        bandwidth_out: Math.floor(Math.random() * 5000000),
        requests_count: Math.floor(Math.random() * 100),
        response_time_avg: Math.random() * 200,
        error_count: Math.floor(Math.random() * 5),
      });
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

router.get('/health/:deployment_id', async (req, res) => {
  try {
    const { deployment_id } = req.params;

    const { data: deployment } = await supabase
      .from('deployments')
      .select('status, health_status, container_id')
      .eq('id', deployment_id)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const health_status = deployment.status === 'running' ? 'healthy' : 'unhealthy';

    await supabase
      .from('deployments')
      .update({
        health_status,
        last_health_check: new Date().toISOString(),
      })
      .eq('id', deployment_id);

    res.json({ status: deployment.status, health: health_status });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

router.post('/calculate-storage', async (req, res) => {
  try {
    const { deployment_id } = req.body;

    const { data: storage } = await supabase
      .from('deployment_storage')
      .select('*')
      .eq('deployment_id', deployment_id);

    const total = storage?.reduce((sum, s) => sum + (s.size_bytes || 0), 0) || 0;

    res.json({ total_bytes: total, storage });
  } catch (error) {
    console.error('Calculate storage error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Calculation failed',
    });
  }
});

export default router;
