import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface MobileSession {
  id: string;
  userId: string;
  projectId: string;
  platform: 'ios' | 'android' | 'web';
  type: 'expo' | 'react-native';
  workdir: string;
  status: 'initializing' | 'ready' | 'running' | 'stopped' | 'error';
  serverUrl?: string;
  qrCode?: string;
  tunnelUrl?: string;
  process?: ChildProcess;
  createdAt: Date;
  expiresAt: Date;
}

export interface ExpoConfig {
  name: string;
  slug: string;
  version: string;
  platforms?: ('ios' | 'android' | 'web')[];
  orientation?: 'portrait' | 'landscape' | 'default';
  icon?: string;
  splash?: {
    image?: string;
    backgroundColor?: string;
  };
}

export class MobileSimulator {
  private sessions: Map<string, MobileSession> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private baseDir: string;
  private basePort: number = 19000;
  private maxSessions: number = 50;

  constructor(config?: {
    baseDir?: string;
    basePort?: number;
    maxSessions?: number;
  }) {
    this.baseDir = config?.baseDir || '/tmp/mobile-sandbox';
    this.basePort = config?.basePort || 19000;
    this.maxSessions = config?.maxSessions || 50;
  }

  async createExpoSession(
    userId: string,
    projectId: string,
    config: ExpoConfig
  ): Promise<MobileSession> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error('Maximum mobile sessions reached');
    }

    const sessionId = uuidv4();
    const workdir = path.join(this.baseDir, sessionId);
    const port = await this.findAvailablePort();

    await fs.mkdir(workdir, { recursive: true });

    const session: MobileSession = {
      id: sessionId,
      userId,
      projectId,
      platform: 'web',
      type: 'expo',
      workdir,
      status: 'initializing',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };

    this.sessions.set(sessionId, session);

    try {
      await this.initializeExpoProject(session, config);
      session.status = 'ready';
    } catch (error) {
      session.status = 'error';
      throw error;
    }

    return session;
  }

  async getSession(sessionId: string): Promise<MobileSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (session && new Date() > session.expiresAt) {
      await this.destroySession(sessionId);
      return undefined;
    }
    return session;
  }

  async writeProjectFiles(
    sessionId: string,
    files: Array<{ path: string; content: string }>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    for (const file of files) {
      const fullPath = path.join(session.workdir, file.path);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, file.content, 'utf8');
    }
  }

  async installDependencies(
    sessionId: string,
    packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'
  ): Promise<{ stdout: string; stderr: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const commands: Record<string, string> = {
      npm: 'npm install',
      yarn: 'yarn install',
      pnpm: 'pnpm install',
    };

    const command = commands[packageManager];

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: session.workdir,
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  async startExpoServer(
    sessionId: string,
    options?: {
      platform?: 'ios' | 'android' | 'web';
      tunnel?: boolean;
      lan?: boolean;
    }
  ): Promise<{
    serverUrl: string;
    qrCode?: string;
    tunnelUrl?: string;
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    if (session.status === 'running') {
      throw new Error('Server already running');
    }

    const platform = options?.platform || 'web';
    const port = await this.findAvailablePort();

    const args = ['start', '--port', port.toString()];

    if (options?.tunnel) {
      args.push('--tunnel');
    } else if (options?.lan) {
      args.push('--lan');
    }

    if (platform === 'web') {
      args.push('--web');
    } else if (platform === 'ios') {
      args.push('--ios');
    } else if (platform === 'android') {
      args.push('--android');
    }

    const child = spawn('npx', ['expo', ...args], {
      cwd: session.workdir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      },
    });

    this.processes.set(sessionId, child);
    session.process = child;
    session.status = 'running';
    session.platform = platform;

    const serverUrl = `http://localhost:${port}`;
    session.serverUrl = serverUrl;

    let qrCode: string | undefined;
    let tunnelUrl: string | undefined;

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`[Expo ${sessionId}]:`, output);

      const qrMatch = output.match(/exp:\/\/[\d\w\-\.]+:\d+/);
      if (qrMatch) {
        qrCode = qrMatch[0];
        session.qrCode = qrCode;
      }

      const tunnelMatch = output.match(/https:\/\/[\w\-]+\.exp\.direct:\d+/);
      if (tunnelMatch) {
        tunnelUrl = tunnelMatch[0];
        session.tunnelUrl = tunnelUrl;
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      console.error(`[Expo ${sessionId} Error]:`, data.toString());
    });

    child.on('exit', (code) => {
      console.log(`[Expo ${sessionId}] Process exited with code ${code}`);
      session.status = code === 0 ? 'stopped' : 'error';
      this.processes.delete(sessionId);
    });

    await this.waitForServer(serverUrl, 30000);

    return {
      serverUrl,
      qrCode: session.qrCode,
      tunnelUrl: session.tunnelUrl,
    };
  }

  async stopExpoServer(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const process = this.processes.get(sessionId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(sessionId);
    }

    session.status = 'stopped';
    session.serverUrl = undefined;
  }

  async buildExpo(
    sessionId: string,
    platform: 'ios' | 'android' | 'web',
    options?: {
      profile?: string;
      local?: boolean;
    }
  ): Promise<{ stdout: string; stderr: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const args = ['build', platform];

    if (options?.profile) {
      args.push('--profile', options.profile);
    }

    if (options?.local) {
      args.push('--local');
    }

    try {
      const { stdout, stderr } = await execAsync(
        `npx expo ${args.join(' ')}`,
        {
          cwd: session.workdir,
          timeout: 600000,
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      return { stdout, stderr };
    } catch (error: any) {
      throw new Error(`Failed to build: ${error.message}`);
    }
  }

  async exportExpo(
    sessionId: string,
    platform: 'web' | 'all' = 'web'
  ): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const outputDir = path.join(session.workdir, 'dist');

    const args = ['export'];

    if (platform === 'web') {
      args.push('--platform', 'web');
    }

    try {
      await execAsync(`npx expo ${args.join(' ')}`, {
        cwd: session.workdir,
        timeout: 300000,
      });

      return outputDir;
    } catch (error: any) {
      throw new Error(`Failed to export: ${error.message}`);
    }
  }

  async getSessionLogs(
    sessionId: string,
    lines: number = 100
  ): Promise<string[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    const logFile = path.join(session.workdir, '.expo', 'dev.log');

    try {
      const content = await fs.readFile(logFile, 'utf8');
      const allLines = content.split('\n');
      return allLines.slice(-lines);
    } catch {
      return [];
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const process = this.processes.get(sessionId);
    if (process) {
      process.kill('SIGKILL');
      this.processes.delete(sessionId);
    }

    try {
      await fs.rm(session.workdir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to remove mobile session directory: ${error}`);
    }

    this.sessions.delete(sessionId);
  }

  async getAllSessions(userId?: string): Promise<MobileSession[]> {
    const sessions = Array.from(this.sessions.values());
    if (userId) {
      return sessions.filter((s) => s.userId === userId);
    }
    return sessions;
  }

  private async initializeExpoProject(
    session: MobileSession,
    config: ExpoConfig
  ): Promise<void> {
    const appJson = {
      expo: {
        name: config.name,
        slug: config.slug,
        version: config.version || '1.0.0',
        platforms: config.platforms || ['ios', 'android', 'web'],
        orientation: config.orientation || 'portrait',
        icon: config.icon || './assets/icon.png',
        splash: config.splash || {
          image: './assets/splash.png',
          backgroundColor: '#ffffff',
        },
        updates: {
          fallbackToCacheTimeout: 0,
        },
        assetBundlePatterns: ['**/*'],
        ios: {
          supportsTablet: true,
        },
        android: {
          adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#FFFFFF',
          },
        },
        web: {
          favicon: './assets/favicon.png',
        },
      },
    };

    const packageJson = {
      name: config.slug,
      version: config.version || '1.0.0',
      main: 'expo-router/entry',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
      },
      dependencies: {
        expo: '~51.0.0',
        'expo-status-bar': '~1.12.1',
        react: '18.2.0',
        'react-native': '0.74.0',
      },
      devDependencies: {
        '@babel/core': '^7.20.0',
      },
      private: true,
    };

    const babelConfig = {
      presets: ['babel-preset-expo'],
    };

    const appTsx = `import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Expo!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
`;

    await fs.writeFile(
      path.join(session.workdir, 'app.json'),
      JSON.stringify(appJson, null, 2)
    );

    await fs.writeFile(
      path.join(session.workdir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.writeFile(
      path.join(session.workdir, 'babel.config.js'),
      `module.exports = ${JSON.stringify(babelConfig, null, 2)};`
    );

    await fs.writeFile(path.join(session.workdir, 'App.tsx'), appTsx);

    const assetsDir = path.join(session.workdir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
  }

  private async findAvailablePort(): Promise<number> {
    const usedPorts = new Set(
      Array.from(this.sessions.values())
        .map((s) => {
          if (s.serverUrl) {
            const match = s.serverUrl.match(/:(\d+)/);
            return match ? parseInt(match[1]) : null;
          }
          return null;
        })
        .filter((p): p is number => p !== null)
    );

    for (let port = this.basePort; port < this.basePort + 1000; port++) {
      if (!usedPorts.has(port)) {
        return port;
      }
    }

    throw new Error('No available ports');
  }

  private async waitForServer(
    url: string,
    timeout: number = 30000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, {
          timeout: 2000,
        });
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Server failed to start within timeout');
  }
}

export const mobileSimulator = new MobileSimulator({
  baseDir: process.env.MOBILE_SANDBOX_DIR || '/tmp/mobile-sandbox',
  basePort: parseInt(process.env.MOBILE_BASE_PORT || '19000'),
  maxSessions: parseInt(process.env.MAX_MOBILE_SESSIONS || '50'),
});
