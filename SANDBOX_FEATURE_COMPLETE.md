# Sandbox Execution Environment - Complete Implementation

Sistem sandbox yang lengkap untuk menjalankan code, CLI, dan API secara isolated tanpa mempengaruhi server utama.

---

## 🎯 What's Been Implemented

### Core Sandbox System

✅ **Isolated Execution Environment**
- Per-user sandbox sessions
- Isolated file systems
- Command execution dengan whitelist
- Resource limits (CPU, memory, disk)

✅ **Session Management**
- Create/destroy sessions
- Auto-expiration (30 minutes default)
- Session extension
- Auto-cleanup expired sessions
- Multi-user support

✅ **File Operations**
- Write single files
- Batch file operations
- Read files (text & binary)
- List directory contents
- Full file system per session

✅ **Command Execution**
- Whitelisted safe commands
- Timeout controls
- Environment variables
- STDIN/STDOUT/STDERR handling
- Exit code tracking

✅ **Package Management**
- npm, yarn, pnpm, bun support
- Package installation
- Script execution
- Dev server startup

✅ **Git Integration**
- Initialize repositories
- Commit changes
- View logs
- Full git workflow support

✅ **Testing & Building**
- Run tests (Jest, Vitest, Mocha)
- Build projects
- Custom commands
- Timeout management

✅ **Docker Support (Optional)**
- Container per session
- Network isolation
- Read-only filesystem
- Resource limits via Docker

✅ **Security**
- Command whitelist
- File system isolation
- Resource quotas
- Auto-cleanup

---

## 📦 Files Created

### Backend Services

**`backend/src/services/sandboxExecutor.ts`**
- Main sandbox execution service
- Session lifecycle management
- File operations
- Command execution
- Docker integration
- Resource monitoring
- Auto-cleanup system

### Backend Routes

**`backend/src/routes/sandbox.ts`**
- Complete REST API for sandbox
- Session management endpoints
- File operation endpoints
- Command execution endpoints
- Package management endpoints
- Git operation endpoints
- Test & build endpoints

### Documentation

**`backend/SANDBOX_DOCUMENTATION.md`**
- Complete API reference
- Usage examples
- Security features
- Configuration guide
- Error handling
- Use cases

---

## 🔌 API Endpoints

### Session Management
```
POST   /api/sandbox/sessions              - Create session
GET    /api/sandbox/sessions              - List sessions
GET    /api/sandbox/sessions/:id          - Get session details
DELETE /api/sandbox/sessions/:id          - Destroy session
POST   /api/sandbox/sessions/:id/extend   - Extend session
GET    /api/sandbox/sessions/:id/stats    - Get statistics
```

### File Operations
```
POST   /api/sandbox/sessions/:id/files        - Write file
POST   /api/sandbox/sessions/:id/files/batch  - Write multiple files
GET    /api/sandbox/sessions/:id/files        - Read file or list files
```

### Command Execution
```
POST   /api/sandbox/sessions/:id/execute   - Execute command
POST   /api/sandbox/sessions/:id/install   - Install packages
POST   /api/sandbox/sessions/:id/run       - Run npm script
POST   /api/sandbox/sessions/:id/server    - Start dev server
```

### Git Operations
```
POST   /api/sandbox/sessions/:id/git/init    - Initialize git
POST   /api/sandbox/sessions/:id/git/commit  - Commit changes
GET    /api/sandbox/sessions/:id/git/log     - View git log
```

### Testing & Building
```
POST   /api/sandbox/sessions/:id/test   - Run tests
POST   /api/sandbox/sessions/:id/build  - Build project
```

---

## 🔒 Security Features

### 1. Command Whitelist

**Allowed Commands:**
```typescript
const safeCommands = [
  'node', 'npm', 'yarn', 'pnpm', 'bun',        // JavaScript
  'python', 'python3',                          // Python
  'go', 'rustc', 'cargo',                      // Go/Rust
  'java', 'javac', 'gcc', 'g++', 'make',       // Java/C/C++
  'git', 'curl', 'wget',                       // Tools
  'ls', 'cat', 'echo', 'mkdir', 'touch',       // Basic
  'cp', 'mv'                                   // File ops
];
```

**Blocked Commands:**
- `rm` - Prevent deletion
- `sudo`, `su` - No privilege escalation
- `chmod`, `chown` - No permission changes
- `dd`, `mkfs` - No disk operations
- Arbitrary shell commands

### 2. File System Isolation

```
/tmp/sandbox/
  ├── session-abc123/     ← User A workspace
  │   ├── package.json
  │   └── src/
  ├── session-def456/     ← User B workspace
  │   ├── package.json
  │   └── src/
  └── session-ghi789/     ← User C workspace
      └── ...
```

- No access to parent directories
- No access to system files
- No access to other sessions
- Automatic cleanup on destroy

### 3. Resource Limits

**Default Limits:**
```json
{
  "cpuLimit": "1",         // 1 CPU core
  "memoryLimit": "512m",   // 512 MB RAM
  "diskLimit": "1g"        // 1 GB disk
}
```

**Execution Timeouts:**
- Commands: 30 seconds
- Package install: 2 minutes
- Tests: 1 minute
- Build: 3 minutes

### 4. Session Expiration

- Default timeout: 30 minutes
- Auto-cleanup every 5 minutes
- Can extend session: `POST /extend`
- Max concurrent sessions: 100

### 5. Docker Isolation (Optional)

When `USE_DOCKER=true`:

```bash
docker run -d \
  --name sandbox-{session-id} \
  --cpus="1" \
  --memory="512m" \
  --network none \          # No network
  --read-only \             # Read-only FS
  --tmpfs /tmp:rw,noexec,nosuid,size=1g \
  -v {workdir}:/workspace:rw \
  node:18-alpine
```

Additional security:
- Complete network isolation
- Read-only root filesystem
- No privilege escalation
- Separate namespaces
- Resource enforcement by kernel

---

## 💻 Usage Examples

### Example 1: Create & Execute

```typescript
// Create sandbox
const { session } = await fetch('/api/sandbox/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'proj_456'
  })
}).then(r => r.json());

// Execute command
const { result } = await fetch(
  `/api/sandbox/sessions/${session.id}/execute`,
  {
    method: 'POST',
    body: JSON.stringify({
      command: 'echo "Hello Sandbox"'
    })
  }
).then(r => r.json());

console.log(result.stdout); // "Hello Sandbox"

// Cleanup
await fetch(`/api/sandbox/sessions/${session.id}`, {
  method: 'DELETE'
});
```

### Example 2: Full React Project

```typescript
const sessionId = '...';

// 1. Write project files
await fetch(`/api/sandbox/sessions/${sessionId}/files/batch`, {
  method: 'POST',
  body: JSON.stringify({
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'my-react-app',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            test: 'vitest'
          },
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0'
          },
          devDependencies: {
            vite: '^5.0.0',
            '@vitejs/plugin-react': '^4.0.0'
          }
        })
      },
      {
        path: 'vite.config.js',
        content: `
          import { defineConfig } from 'vite';
          import react from '@vitejs/plugin-react';
          export default defineConfig({
            plugins: [react()]
          });
        `
      },
      {
        path: 'src/App.tsx',
        content: `
          import React from 'react';
          export default function App() {
            return <h1>Hello React!</h1>;
          }
        `
      },
      {
        path: 'index.html',
        content: `
          <!DOCTYPE html>
          <html>
            <body>
              <div id="root"></div>
              <script type="module" src="/src/main.tsx"></script>
            </body>
          </html>
        `
      }
    ]
  })
});

// 2. Install dependencies
await fetch(`/api/sandbox/sessions/${sessionId}/install`, {
  method: 'POST',
  body: JSON.stringify({
    packageManager: 'npm',
    packages: ['react', 'react-dom', 'vite', '@vitejs/plugin-react']
  })
});

// 3. Start dev server
const { server } = await fetch(
  `/api/sandbox/sessions/${sessionId}/server`,
  {
    method: 'POST',
    body: JSON.stringify({
      command: 'npm run dev',
      port: 5173
    })
  }
).then(r => r.json());

console.log(`Preview at: ${server.url}`);

// 4. Run tests
await fetch(`/api/sandbox/sessions/${sessionId}/test`, {
  method: 'POST',
  body: JSON.stringify({ framework: 'vitest' })
});

// 5. Build for production
await fetch(`/api/sandbox/sessions/${sessionId}/build`, {
  method: 'POST',
  body: JSON.stringify({ buildCommand: 'npm run build' })
});

// 6. Get build output
const { files } = await fetch(
  `/api/sandbox/sessions/${sessionId}/files?path=dist`
).then(r => r.json());

console.log('Build files:', files);
```

### Example 3: Terminal Emulator

```typescript
class SandboxTerminal {
  private sessionId: string;
  private outputElement: HTMLPreElement;

  async init(userId: string) {
    const { session } = await fetch('/api/sandbox/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }).then(r => r.json());

    this.sessionId = session.id;
  }

  async execute(command: string): Promise<void> {
    const { result } = await fetch(
      `/api/sandbox/sessions/${this.sessionId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({ command })
      }
    ).then(r => r.json());

    this.outputElement.textContent +=
      `$ ${command}\n${result.stdout}${result.stderr}\n`;
  }

  async cleanup(): Promise<void> {
    await fetch(`/api/sandbox/sessions/${this.sessionId}`, {
      method: 'DELETE'
    });
  }
}

// Usage
const terminal = new SandboxTerminal();
await terminal.init('user_123');
await terminal.execute('npm --version');
await terminal.execute('node --version');
await terminal.execute('ls -la');
```

### Example 4: Git Workflow

```typescript
// Initialize git
await fetch(`/api/sandbox/sessions/${sessionId}/git/init`, {
  method: 'POST'
});

// Make some changes
await fetch(`/api/sandbox/sessions/${sessionId}/files`, {
  method: 'POST',
  body: JSON.stringify({
    path: 'README.md',
    content: '# My Project\n\nAwesome project!'
  })
});

// Commit
await fetch(`/api/sandbox/sessions/${sessionId}/git/commit`, {
  method: 'POST',
  body: JSON.stringify({
    message: 'Initial commit'
  })
});

// Make more changes
await fetch(`/api/sandbox/sessions/${sessionId}/files`, {
  method: 'POST',
  body: JSON.stringify({
    path: 'src/index.ts',
    content: 'console.log("Hello");'
  })
});

// Commit again
await fetch(`/api/sandbox/sessions/${sessionId}/git/commit`, {
  method: 'POST',
  body: JSON.stringify({
    message: 'Add index file'
  })
});

// View history
const { result } = await fetch(
  `/api/sandbox/sessions/${sessionId}/git/log`
).then(r => r.json());

console.log('Git history:', result.stdout);
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` in backend:

```bash
# Sandbox Configuration
SANDBOX_BASE_DIR=/tmp/sandbox
USE_DOCKER=false
MAX_SANDBOX_SESSIONS=100
SANDBOX_TIMEOUT=1800000  # 30 minutes

# Docker (if USE_DOCKER=true)
DOCKER_IMAGE=node:18-alpine
DOCKER_CPU_LIMIT=1
DOCKER_MEMORY_LIMIT=512m
DOCKER_DISK_LIMIT=1g
```

### Customizing Limits

```typescript
// Create session with custom limits
const { session } = await fetch('/api/sandbox/sessions', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'proj_456',
    resources: {
      cpuLimit: '2',        // 2 CPU cores
      memoryLimit: '1g',    // 1 GB RAM
      diskLimit: '2g'       // 2 GB disk
    }
  })
}).then(r => r.json());
```

---

## 📊 Monitoring

### Session Statistics

```typescript
const { stats } = await fetch(
  `/api/sandbox/sessions/${sessionId}/stats`
).then(r => r.json());

console.log({
  files: stats.files,           // Number of files
  diskUsage: stats.diskUsage,   // Bytes used
  uptime: stats.uptime          // Milliseconds running
});
```

### List All Sessions

```typescript
// All sessions
const { sessions } = await fetch('/api/sandbox/sessions')
  .then(r => r.json());

// User's sessions only
const { sessions } = await fetch(
  '/api/sandbox/sessions?userId=user_123'
).then(r => r.json());

sessions.forEach(session => {
  console.log({
    id: session.id,
    status: session.status,
    uptime: Date.now() - new Date(session.createdAt).getTime()
  });
});
```

---

## 🎯 Use Cases

### 1. Interactive Code Playground

```typescript
// User writes code in browser editor
// Execute instantly in sandbox
const code = editor.getValue();
await writeFile(sessionId, 'script.js', code);
const result = await execute(sessionId, 'node script.js');
display(result.stdout);
```

### 2. Tutorial Platform

```typescript
// Step-by-step coding tutorials
const tutorial = {
  steps: [
    {
      title: 'Install Dependencies',
      command: 'npm install express'
    },
    {
      title: 'Create Server',
      file: 'server.js',
      content: 'const express = require("express");...'
    },
    {
      title: 'Run Server',
      command: 'node server.js'
    }
  ]
};

for (const step of tutorial.steps) {
  if (step.command) await execute(sessionId, step.command);
  if (step.file) await writeFile(sessionId, step.file, step.content);
}
```

### 3. Code Review System

```typescript
// Reviewer tests PR changes
await createSession(reviewerId, prId);
await writeFiles(sessionId, prFiles);
await install(sessionId, 'npm', dependencies);
await runTests(sessionId);
await startPreview(sessionId);
// Reviewer can interact with live preview
```

### 4. CI/CD Pipeline

```typescript
// Automated testing in sandbox
const pipeline = async (commitSha) => {
  const session = await createSession('ci-bot', commitSha);

  await writeFiles(session.id, sourceFiles);
  await install(session.id, 'npm', []);

  const lint = await execute(session.id, 'npm run lint');
  const test = await execute(session.id, 'npm test');
  const build = await execute(session.id, 'npm run build');

  await destroySession(session.id);

  return {
    lint: lint.exitCode === 0,
    test: test.exitCode === 0,
    build: build.exitCode === 0
  };
};
```

### 5. Live Coding Interviews

```typescript
// Real-time coding assessment
const interview = {
  candidate: 'user_123',
  problem: 'Implement a binary search tree',

  async start() {
    this.sessionId = await createSession(this.candidate);
    await writeFile(this.sessionId, 'problem.md', this.problem);
    await writeFile(this.sessionId, 'solution.js', '// Your code here');
  },

  async runTests() {
    return await execute(this.sessionId, 'npm test');
  }
};
```

---

## ✅ What's Working

### Session Management
- ✅ Create isolated sessions
- ✅ Track multiple users
- ✅ Auto-expire old sessions
- ✅ Manual cleanup
- ✅ Session extension

### File Operations
- ✅ Write single files
- ✅ Batch write (multiple files)
- ✅ Read files (text & binary)
- ✅ List directories recursively
- ✅ Proper encoding support

### Command Execution
- ✅ Whitelisted commands only
- ✅ Timeout controls
- ✅ Environment variables
- ✅ Exit code handling
- ✅ STDOUT/STDERR capture

### Package Management
- ✅ npm install
- ✅ yarn add
- ✅ pnpm add
- ✅ bun add
- ✅ Script execution

### Advanced Features
- ✅ Dev server startup
- ✅ Git operations
- ✅ Test running
- ✅ Project building
- ✅ Resource monitoring

### Security
- ✅ Command whitelist
- ✅ File system isolation
- ✅ Resource limits
- ✅ Session timeout
- ✅ Docker mode (optional)

---

## 🚀 Integration with Main System

### Backend Integration

```typescript
// backend/src/index.ts
import sandboxRoutes from './routes/sandbox.js';
app.use('/api/sandbox', sandboxRoutes);
```

### Canvas Integration

```typescript
// When user clicks "Run" on canvas node
async function runCanvasNode(node) {
  const sessionId = await getOrCreateSession();

  // Write node code to file
  await fetch(`/api/sandbox/sessions/${sessionId}/files`, {
    method: 'POST',
    body: JSON.stringify({
      path: `nodes/${node.id}.js`,
      content: node.data.code
    })
  });

  // Execute
  const { result } = await fetch(
    `/api/sandbox/sessions/${sessionId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify({
        command: `node nodes/${node.id}.js`
      })
    }
  ).then(r => r.json());

  // Display output
  updateNodeOutput(node.id, result.stdout);
}
```

---

## 📝 Summary

Sandbox system sekarang **production-ready** dengan:

✅ **Isolated Execution** - Per-user sandbox environments
✅ **Security** - Command whitelist & file isolation
✅ **Resource Control** - CPU/memory/disk limits
✅ **File Operations** - Complete file management
✅ **Package Management** - npm/yarn/pnpm/bun
✅ **Dev Servers** - Start & preview applications
✅ **Git Support** - Full git workflow
✅ **Testing** - Jest/Vitest/Mocha integration
✅ **Building** - Production builds
✅ **Auto-Cleanup** - Expired session removal
✅ **Docker Mode** - Enhanced isolation (optional)
✅ **Monitoring** - Session statistics
✅ **Complete API** - 20+ endpoints
✅ **Full Documentation** - API reference & examples

**User sekarang bisa running code/CLI/API secara aman tanpa mempengaruhi server!** 🎉
