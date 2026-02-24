import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface SandboxSession {
  id: string;
  userId: string;
  projectId: string;
  workdir: string;
  containerId?: string;
  status: 'initializing' | 'ready' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  expiresAt: Date;
  resources: {
    cpuLimit: string;
    memoryLimit: string;
    diskLimit: string;
  };
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  error?: string;
}

export interface SandboxFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

export class SandboxExecutor {
  private sessions: Map<string, SandboxSession> = new Map();
  private sandboxBaseDir: string;
  private useDocker: boolean;
  private maxSessions: number = 100;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  constructor(config?: {
    baseDir?: string;
    useDocker?: boolean;
    maxSessions?: number;
    sessionTimeout?: number;
  }) {
    this.sandboxBaseDir = config?.baseDir || '/tmp/sandbox';
    this.useDocker = config?.useDocker ?? false;
    this.maxSessions = config?.maxSessions || 100;
    this.sessionTimeout = config?.sessionTimeout || 30 * 60 * 1000;

    this.initializeCleanup();
  }

  async createSession(
    userId: string,
    projectId: string,
    options?: {
      cpuLimit?: string;
      memoryLimit?: string;
      diskLimit?: string;
    }
  ): Promise<SandboxSession> {
    if (this.sessions.size >= this.maxSessions) {
      await this.cleanupExpiredSessions();
    }

    if (this.sessions.size >= this.maxSessions) {
      throw new Error('Maximum sandbox sessions reached');
    }

    const sessionId = uuidv4();
    const workdir = path.join(this.sandboxBaseDir, sessionId);

    await fs.mkdir(workdir, { recursive: true });

    const session: SandboxSession = {
      id: sessionId,
      userId,
      projectId,
      workdir,
      status: 'initializing',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.sessionTimeout),
      resources: {
        cpuLimit: options?.cpuLimit || '1',
        memoryLimit: options?.memoryLimit || '512m',
        diskLimit: options?.diskLimit || '1g',
      },
    };

    this.sessions.set(sessionId, session);

    if (this.useDocker) {
      await this.initializeDockerContainer(session);
    } else {
      session.status = 'ready';
    }

    return session;
  }

  async getSession(sessionId: string): Promise<SandboxSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (session && new Date() > session.expiresAt) {
      await this.destroySession(sessionId);
      return undefined;
    }
    return session;
  }

  async extendSession(sessionId: string, minutes: number = 30): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    session.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  }

  async writeFile(
    sessionId: string,
    filePath: string,
    content: string,
    encoding: 'utf8' | 'base64' = 'utf8'
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const fullPath = path.join(session.workdir, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });

    if (encoding === 'base64') {
      await fs.writeFile(fullPath, Buffer.from(content, 'base64'));
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }
  }

  async writeFiles(sessionId: string, files: SandboxFile[]): Promise<void> {
    for (const file of files) {
      await this.writeFile(sessionId, file.path, file.content, file.encoding);
    }
  }

  async readFile(
    sessionId: string,
    filePath: string,
    encoding: 'utf8' | 'base64' = 'utf8'
  ): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const fullPath = path.join(session.workdir, filePath);

    if (encoding === 'base64') {
      const buffer = await fs.readFile(fullPath);
      return buffer.toString('base64');
    } else {
      return await fs.readFile(fullPath, 'utf8');
    }
  }

  async listFiles(sessionId: string, dirPath: string = '.'): Promise<string[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const fullPath = path.join(session.workdir, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const files: string[] = [];
    for (const entry of entries) {
      const relativePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.listFiles(sessionId, relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }

    return files;
  }

  async executeCommand(
    sessionId: string,
    command: string,
    options?: {
      timeout?: number;
      env?: Record<string, string>;
      stdin?: string;
    }
  ): Promise<ExecutionResult> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    if (session.status === 'stopped') {
      throw new Error('Session is stopped');
    }

    session.status = 'running';
    const startTime = Date.now();

    try {
      let result: ExecutionResult;

      if (this.useDocker && session.containerId) {
        result = await this.executeInDocker(session, command, options);
      } else {
        result = await this.executeLocally(session, command, options);
      }

      result.duration = Date.now() - startTime;
      session.status = 'ready';

      await this.extendSession(sessionId, 30);

      return result;
    } catch (error) {
      session.status = 'error';
      throw error;
    }
  }

  async installPackage(
    sessionId: string,
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun',
    packages: string[]
  ): Promise<ExecutionResult> {
    const commands: Record<string, string> = {
      npm: `npm install ${packages.join(' ')}`,
      yarn: `yarn add ${packages.join(' ')}`,
      pnpm: `pnpm add ${packages.join(' ')}`,
      bun: `bun add ${packages.join(' ')}`,
    };

    return this.executeCommand(sessionId, commands[packageManager], {
      timeout: 120000,
    });
  }

  async runScript(
    sessionId: string,
    scriptName: string,
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm'
  ): Promise<ExecutionResult> {
    const commands: Record<string, string> = {
      npm: `npm run ${scriptName}`,
      yarn: `yarn ${scriptName}`,
      pnpm: `pnpm ${scriptName}`,
      bun: `bun run ${scriptName}`,
    };

    return this.executeCommand(sessionId, commands[packageManager]);
  }

  async startServer(
    sessionId: string,
    command: string,
    port: number
  ): Promise<{ processId: string; url: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const processId = uuidv4();

    const child = spawn('sh', ['-c', command], {
      cwd: session.workdir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.unref();

    const logPath = path.join(session.workdir, `${processId}.log`);
    const logStream = createWriteStream(logPath);
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);

    const url = this.useDocker
      ? `http://localhost:${port}`
      : `http://localhost:${port}`;

    return { processId, url };
  }

  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'stopped';

    if (this.useDocker && session.containerId) {
      await this.stopDockerContainer(session.containerId);
    }

    try {
      await fs.rm(session.workdir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to remove sandbox directory: ${error}`);
    }

    this.sessions.delete(sessionId);
  }

  async getSessionStats(sessionId: string): Promise<{
    files: number;
    diskUsage: number;
    uptime: number;
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const files = await this.listFiles(sessionId);
    const diskUsage = await this.calculateDiskUsage(session.workdir);
    const uptime = Date.now() - session.createdAt.getTime();

    return {
      files: files.length,
      diskUsage,
      uptime,
    };
  }

  private async executeLocally(
    session: SandboxSession,
    command: string,
    options?: {
      timeout?: number;
      env?: Record<string, string>;
    }
  ): Promise<ExecutionResult> {
    const timeout = options?.timeout || 30000;
    const env = { ...process.env, ...options?.env };

    const safeCommands = [
      'node',
      'npm',
      'yarn',
      'pnpm',
      'bun',
      'python',
      'python3',
      'go',
      'rustc',
      'cargo',
      'java',
      'javac',
      'gcc',
      'g++',
      'make',
      'git',
      'curl',
      'wget',
      'ls',
      'cat',
      'echo',
      'mkdir',
      'touch',
      'cp',
      'mv',
    ];

    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];

    if (!safeCommands.includes(baseCommand)) {
      throw new Error(`Command not allowed: ${baseCommand}`);
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: session.workdir,
        timeout,
        env,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        duration: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: 0,
        error: error.message,
      };
    }
  }

  private async executeInDocker(
    session: SandboxSession,
    command: string,
    options?: {
      timeout?: number;
      env?: Record<string, string>;
    }
  ): Promise<ExecutionResult> {
    if (!session.containerId) {
      throw new Error('Container not initialized');
    }

    const timeout = options?.timeout || 30000;
    const envFlags = options?.env
      ? Object.entries(options.env)
          .map(([k, v]) => `-e ${k}="${v}"`)
          .join(' ')
      : '';

    const dockerCommand = `docker exec ${envFlags} ${session.containerId} sh -c "${command.replace(/"/g, '\\"')}"`;

    try {
      const { stdout, stderr } = await execAsync(dockerCommand, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        duration: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: 0,
        error: error.message,
      };
    }
  }

  private async initializeDockerContainer(
    session: SandboxSession
  ): Promise<void> {
    const containerName = `sandbox-${session.id}`;
    const image = 'node:18-alpine';

    const dockerCommand = `docker run -d \
      --name ${containerName} \
      --cpus="${session.resources.cpuLimit}" \
      --memory="${session.resources.memoryLimit}" \
      --network none \
      --read-only \
      --tmpfs /tmp:rw,noexec,nosuid,size=${session.resources.diskLimit} \
      -v ${session.workdir}:/workspace:rw \
      -w /workspace \
      ${image} \
      sleep infinity`;

    try {
      const { stdout } = await execAsync(dockerCommand);
      session.containerId = stdout.trim();
      session.status = 'ready';
    } catch (error: any) {
      session.status = 'error';
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  private async stopDockerContainer(containerId: string): Promise<void> {
    try {
      await execAsync(`docker stop ${containerId}`);
      await execAsync(`docker rm ${containerId}`);
    } catch (error) {
      console.error(`Failed to stop container: ${error}`);
    }
  }

  private async calculateDiskUsage(dir: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`du -sb ${dir}`);
      return parseInt(stdout.split('\t')[0]);
    } catch {
      return 0;
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.destroySession(sessionId);
    }
  }

  private initializeCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, 5 * 60 * 1000);
  }

  async getAllSessions(userId?: string): Promise<SandboxSession[]> {
    const sessions = Array.from(this.sessions.values());
    if (userId) {
      return sessions.filter((s) => s.userId === userId);
    }
    return sessions;
  }
}

export const sandboxExecutor = new SandboxExecutor({
  baseDir: process.env.SANDBOX_BASE_DIR || '/tmp/sandbox',
  useDocker: process.env.USE_DOCKER === 'true',
  maxSessions: parseInt(process.env.MAX_SANDBOX_SESSIONS || '100'),
  sessionTimeout: parseInt(process.env.SANDBOX_TIMEOUT || String(30 * 60 * 1000)),
});
