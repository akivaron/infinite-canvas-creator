import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export class TerminalExecutor {
  private commandHistory: Array<{ command: string; timestamp: number; result: CommandResult }> = [];
  private allowedCommands: Set<string> = new Set([
    'npm', 'yarn', 'pnpm', 'bun',
    'node', 'deno', 'python', 'python3',
    'git', 'ls', 'pwd', 'cat', 'echo',
    'mkdir', 'rm', 'cp', 'mv',
    'tsc', 'tsx', 'vite', 'webpack',
    'test', 'lint', 'build', 'dev', 'start',
  ]);

  async execute(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    const startTime = Date.now();

    const baseCommand = command.split(' ')[0];
    if (!this.isCommandAllowed(baseCommand)) {
      throw new Error(`Command not allowed: ${baseCommand}`);
    }

    if (this.isDangerousCommand(command)) {
      throw new Error(`Dangerous command detected: ${command}`);
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.cwd || process.cwd(),
        timeout: options.timeout || 30000,
        env: { ...process.env, ...options.env },
        maxBuffer: 1024 * 1024 * 10,
      });

      const result: CommandResult = {
        stdout,
        stderr,
        exitCode: 0,
        duration: Date.now() - startTime,
      };

      this.addToHistory(command, result);
      return result;
    } catch (error: any) {
      const result: CommandResult = {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
      };

      this.addToHistory(command, result);
      return result;
    }
  }

  async executeInteractive(
    command: string,
    onData: (data: string) => void,
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const baseCommand = command.split(' ')[0];

      if (!this.isCommandAllowed(baseCommand)) {
        reject(new Error(`Command not allowed: ${baseCommand}`));
        return;
      }

      const args = command.split(' ').slice(1);
      const child = spawn(baseCommand, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        onData(text);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        onData(text);
      });

      child.on('close', (exitCode) => {
        const result: CommandResult = {
          stdout,
          stderr,
          exitCode: exitCode || 0,
          duration: Date.now() - startTime,
        };

        this.addToHistory(command, result);
        resolve(result);
      });

      child.on('error', (error) => {
        reject(error);
      });

      if (options.timeout) {
        setTimeout(() => {
          child.kill();
          reject(new Error('Command timeout'));
        }, options.timeout);
      }
    });
  }

  async installDependency(packageName: string, options: { dev?: boolean; manager?: 'npm' | 'yarn' | 'pnpm' | 'bun' } = {}): Promise<CommandResult> {
    const manager = options.manager || 'npm';
    const devFlag = options.dev ? '-D' : '';

    let command = '';
    switch (manager) {
      case 'npm':
        command = `npm install ${devFlag} ${packageName}`;
        break;
      case 'yarn':
        command = `yarn add ${devFlag ? '--dev' : ''} ${packageName}`;
        break;
      case 'pnpm':
        command = `pnpm add ${devFlag} ${packageName}`;
        break;
      case 'bun':
        command = `bun add ${devFlag} ${packageName}`;
        break;
    }

    return this.execute(command);
  }

  async runScript(scriptName: string, options: { manager?: 'npm' | 'yarn' | 'pnpm' | 'bun' } = {}): Promise<CommandResult> {
    const manager = options.manager || 'npm';

    let command = '';
    switch (manager) {
      case 'npm':
        command = `npm run ${scriptName}`;
        break;
      case 'yarn':
        command = `yarn ${scriptName}`;
        break;
      case 'pnpm':
        command = `pnpm ${scriptName}`;
        break;
      case 'bun':
        command = `bun run ${scriptName}`;
        break;
    }

    return this.execute(command);
  }

  async gitCommand(args: string): Promise<CommandResult> {
    return this.execute(`git ${args}`);
  }

  async listFiles(directory: string = '.'): Promise<string[]> {
    const result = await this.execute(`ls -la ${directory}`);
    if (result.exitCode !== 0) return [];

    return result.stdout
      .split('\n')
      .slice(1)
      .filter(line => line.trim().length > 0)
      .map(line => {
        const parts = line.split(/\s+/);
        return parts[parts.length - 1];
      })
      .filter(name => name !== '.' && name !== '..');
  }

  async readFile(filePath: string): Promise<string> {
    const result = await this.execute(`cat ${filePath}`);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }
    return result.stdout;
  }

  getHistory(limit: number = 10): Array<{ command: string; timestamp: number; result: CommandResult }> {
    return this.commandHistory.slice(-limit);
  }

  suggestCommand(context: string): string[] {
    const suggestions: string[] = [];

    if (context.includes('install') || context.includes('dependency')) {
      suggestions.push('npm install <package>', 'yarn add <package>');
    }

    if (context.includes('test')) {
      suggestions.push('npm test', 'npm run test:watch');
    }

    if (context.includes('build')) {
      suggestions.push('npm run build', 'npm run build:prod');
    }

    if (context.includes('lint')) {
      suggestions.push('npm run lint', 'npm run lint:fix');
    }

    if (context.includes('git')) {
      suggestions.push('git status', 'git add .', 'git commit -m "message"', 'git push');
    }

    return suggestions;
  }

  private isCommandAllowed(command: string): boolean {
    return this.allowedCommands.has(command) || this.allowedCommands.has(command.toLowerCase());
  }

  private isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
      /rm\s+-rf\s+\/\s*$/,
      /rm\s+-rf\s+\*/,
      />\s*\/dev\/sda/,
      /mkfs/,
      /dd\s+if=/,
      /:\(\)\{.*\}.*:/,
      /sudo\s+rm/,
      /chmod\s+-R\s+777/,
    ];

    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  private addToHistory(command: string, result: CommandResult): void {
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
      result,
    });

    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }
  }

  async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
    const checks = [
      { file: 'bun.lockb', manager: 'bun' as const },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
      { file: 'yarn.lock', manager: 'yarn' as const },
      { file: 'package-lock.json', manager: 'npm' as const },
    ];

    for (const check of checks) {
      try {
        await this.execute(`test -f ${check.file}`);
        return check.manager;
      } catch {
        continue;
      }
    }

    return 'npm';
  }

  async getAvailableScripts(): Promise<string[]> {
    try {
      const packageJson = await this.readFile('package.json');
      const parsed = JSON.parse(packageJson);
      return Object.keys(parsed.scripts || {});
    } catch {
      return [];
    }
  }

  clearHistory(): void {
    this.commandHistory = [];
  }
}
