# Sandbox Execution Environment Documentation

Isolated sandbox environment untuk menjalankan code, CLI commands, dan API tests tanpa mempengaruhi server utama.

---

## 🎯 Overview

Sandbox system menyediakan:
- ✅ Isolated execution environment per user
- ✅ Resource limits (CPU, memory, disk)
- ✅ File system isolation
- ✅ Command execution dengan whitelist
- ✅ Package installation (npm/yarn/pnpm/bun)
- ✅ Server startup & port mapping
- ✅ Git operations
- ✅ Test running
- ✅ Build execution
- ✅ Auto-cleanup expired sessions
- ✅ Optional Docker containerization

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
│   - Code editor                                              │
│   - Terminal emulator                                        │
│   - Preview window                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Sandbox API (/api/sandbox)              │
│                                                              │
│  Session Management:                                         │
│  • Create/destroy sessions                                   │
│  • Track active sessions                                     │
│  • Auto-expire & cleanup                                     │
│                                                              │
│  File Operations:                                            │
│  • Write/read files                                          │
│  • Batch file operations                                     │
│  • List directory contents                                   │
│                                                              │
│  Command Execution:                                          │
│  • Execute whitelisted commands                              │
│  • Install packages                                          │
│  • Run scripts                                               │
│  • Start dev servers                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Sandbox Executor Service                        │
│                                                              │
│  Local Mode (Default):                                       │
│  • /tmp/sandbox/{session-id}/                                │
│  • Isolated file system                                      │
│  • Command whitelist security                                │
│  • Resource monitoring                                       │
│                                                              │
│  Docker Mode (Optional):                                     │
│  • Docker container per session                              │
│  • --cpus, --memory limits                                   │
│  • --network none (network isolation)                        │
│  • --read-only filesystem                                    │
│  • Mounted workspace volume                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 API Endpoints

Base URL: `http://localhost:3001/api/sandbox`

### Session Management

#### Create Sandbox Session

```http
POST /api/sandbox/sessions
```

**Request:**
```json
{
  "userId": "user_123",
  "projectId": "proj_456",
  "resources": {
    "cpuLimit": "1",
    "memoryLimit": "512m",
    "diskLimit": "1g"
  }
}
```

**Response:**
```json
{
  "session": {
    "id": "a1b2c3d4-...",
    "status": "ready",
    "workdir": "/tmp/sandbox/a1b2c3d4-.../",
    "expiresAt": "2024-01-01T01:00:00Z",
    "resources": {
      "cpuLimit": "1",
      "memoryLimit": "512m",
      "diskLimit": "1g"
    }
  }
}
```

#### List Sessions

```http
GET /api/sandbox/sessions?userId=user_123
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "a1b2c3d4-...",
      "userId": "user_123",
      "projectId": "proj_456",
      "status": "ready",
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-01T01:00:00Z"
    }
  ]
}
```

#### Get Session Details

```http
GET /api/sandbox/sessions/:sessionId
```

#### Extend Session

```http
POST /api/sandbox/sessions/:sessionId/extend
```

**Request:**
```json
{
  "minutes": 30
}
```

#### Destroy Session

```http
DELETE /api/sandbox/sessions/:sessionId
```

---

### File Operations

#### Write File

```http
POST /api/sandbox/sessions/:sessionId/files
```

**Request:**
```json
{
  "path": "src/App.tsx",
  "content": "import React from 'react';\n...",
  "encoding": "utf8"
}
```

#### Write Multiple Files

```http
POST /api/sandbox/sessions/:sessionId/files/batch
```

**Request:**
```json
{
  "files": [
    {
      "path": "package.json",
      "content": "{...}",
      "encoding": "utf8"
    },
    {
      "path": "src/index.tsx",
      "content": "import React from 'react';...",
      "encoding": "utf8"
    }
  ]
}
```

#### Read File

```http
GET /api/sandbox/sessions/:sessionId/files?path=src/App.tsx&encoding=utf8
```

**Response:**
```json
{
  "path": "src/App.tsx",
  "content": "import React from 'react';\n...",
  "encoding": "utf8"
}
```

#### List Files

```http
GET /api/sandbox/sessions/:sessionId/files?path=.
```

**Response:**
```json
{
  "files": [
    "package.json",
    "src/App.tsx",
    "src/index.tsx",
    "public/index.html"
  ]
}
```

---

### Command Execution

#### Execute Command

```http
POST /api/sandbox/sessions/:sessionId/execute
```

**Request:**
```json
{
  "command": "ls -la",
  "timeout": 30000,
  "env": {
    "NODE_ENV": "development"
  }
}
```

**Response:**
```json
{
  "result": {
    "stdout": "total 8\ndrwxr-xr-x  3 user  wheel  96 Jan  1 00:00 .\n...",
    "stderr": "",
    "exitCode": 0,
    "duration": 45
  }
}
```

**Whitelisted Commands:**
- `node`, `npm`, `yarn`, `pnpm`, `bun`
- `python`, `python3`, `go`, `rustc`, `cargo`
- `java`, `javac`, `gcc`, `g++`, `make`
- `git`, `curl`, `wget`
- `ls`, `cat`, `echo`, `mkdir`, `touch`, `cp`, `mv`

#### Install Packages

```http
POST /api/sandbox/sessions/:sessionId/install
```

**Request:**
```json
{
  "packageManager": "npm",
  "packages": ["react", "react-dom", "typescript"]
}
```

**Response:**
```json
{
  "result": {
    "stdout": "added 150 packages...",
    "stderr": "",
    "exitCode": 0,
    "duration": 15230
  }
}
```

**Supported Package Managers:**
- `npm` - npm install
- `yarn` - yarn add
- `pnpm` - pnpm add
- `bun` - bun add

#### Run Script

```http
POST /api/sandbox/sessions/:sessionId/run
```

**Request:**
```json
{
  "script": "dev",
  "packageManager": "npm"
}
```

Executes: `npm run dev`

#### Start Dev Server

```http
POST /api/sandbox/sessions/:sessionId/server
```

**Request:**
```json
{
  "command": "npm run dev",
  "port": 3000
}
```

**Response:**
```json
{
  "server": {
    "processId": "proc_123",
    "url": "http://localhost:3000"
  }
}
```

**Note:** Server runs in background, logs written to `{processId}.log`

---

### Git Operations

#### Initialize Git

```http
POST /api/sandbox/sessions/:sessionId/git/init
```

#### Commit Changes

```http
POST /api/sandbox/sessions/:sessionId/git/commit
```

**Request:**
```json
{
  "message": "Initial commit"
}
```

Executes:
```bash
git add .
git commit -m "Initial commit"
```

#### View Git Log

```http
GET /api/sandbox/sessions/:sessionId/git/log
```

**Response:**
```json
{
  "result": {
    "stdout": "a1b2c3d Initial commit\ne4f5g6h Add components\n...",
    "exitCode": 0
  }
}
```

---

### Testing & Building

#### Run Tests

```http
POST /api/sandbox/sessions/:sessionId/test
```

**Request:**
```json
{
  "framework": "jest",
  "testFile": "src/App.test.tsx"
}
```

**Supported Frameworks:**
- `jest` - npm test
- `vitest` - npm run test
- `mocha` - npm run test

#### Build Project

```http
POST /api/sandbox/sessions/:sessionId/build
```

**Request:**
```json
{
  "buildCommand": "npm run build"
}
```

Default timeout: 3 minutes

---

### Statistics

#### Get Session Stats

```http
GET /api/sandbox/sessions/:sessionId/stats
```

**Response:**
```json
{
  "stats": {
    "files": 42,
    "diskUsage": 15728640,
    "uptime": 1234567
  }
}
```

---

## 🔒 Security Features

### 1. Command Whitelist

Only safe commands allowed:
```typescript
const safeCommands = [
  'node', 'npm', 'yarn', 'pnpm', 'bun',
  'python', 'python3', 'go', 'rustc', 'cargo',
  'java', 'javac', 'gcc', 'g++', 'make',
  'git', 'curl', 'wget',
  'ls', 'cat', 'echo', 'mkdir', 'touch', 'cp', 'mv'
];
```

Dangerous commands blocked:
- `rm -rf` / `rm`
- `dd`
- `mkfs`
- `chmod`, `chown`
- `sudo`, `su`
- Network commands (except whitelisted)

### 2. File System Isolation

Each session gets isolated directory:
```
/tmp/sandbox/
  ├── session-1/
  │   ├── package.json
  │   └── src/
  ├── session-2/
  │   ├── package.json
  │   └── src/
  └── ...
```

Cannot access:
- Parent directories (`../`)
- System directories (`/etc`, `/usr`, etc)
- Other sessions

### 3. Resource Limits

**CPU Limit:**
```json
{
  "cpuLimit": "1"  // 1 CPU core
}
```

**Memory Limit:**
```json
{
  "memoryLimit": "512m"  // 512 MB RAM
}
```

**Disk Limit:**
```json
{
  "diskLimit": "1g"  // 1 GB disk space
}
```

### 4. Execution Timeout

Default timeouts:
- Commands: 30 seconds
- Package install: 2 minutes
- Tests: 1 minute
- Build: 3 minutes

Can be customized per request.

### 5. Session Expiration

- Default: 30 minutes
- Auto-cleanup every 5 minutes
- Can be extended: `POST /sessions/:id/extend`

### 6. Docker Isolation (Optional)

When Docker enabled:
```bash
docker run -d \
  --name sandbox-{session-id} \
  --cpus="1" \
  --memory="512m" \
  --network none \        # No network access
  --read-only \           # Read-only filesystem
  --tmpfs /tmp:rw,noexec,nosuid,size=1g \
  -v {workdir}:/workspace:rw \
  node:18-alpine \
  sleep infinity
```

Additional isolation:
- No network access
- Read-only root filesystem
- Limited system calls
- Separate namespaces

---

## 📝 Configuration

### Environment Variables

```bash
# Sandbox configuration
SANDBOX_BASE_DIR=/tmp/sandbox
USE_DOCKER=false
MAX_SANDBOX_SESSIONS=100
SANDBOX_TIMEOUT=1800000  # 30 minutes in ms

# Docker configuration (if USE_DOCKER=true)
DOCKER_IMAGE=node:18-alpine
DOCKER_CPU_LIMIT=1
DOCKER_MEMORY_LIMIT=512m
```

### Backend Configuration

```typescript
// backend/src/services/sandboxExecutor.ts
export const sandboxExecutor = new SandboxExecutor({
  baseDir: process.env.SANDBOX_BASE_DIR || '/tmp/sandbox',
  useDocker: process.env.USE_DOCKER === 'true',
  maxSessions: parseInt(process.env.MAX_SANDBOX_SESSIONS || '100'),
  sessionTimeout: parseInt(process.env.SANDBOX_TIMEOUT || '1800000'),
});
```

---

## 🚀 Usage Examples

### Complete Workflow

```typescript
// 1. Create sandbox session
const { session } = await fetch('/api/sandbox/sessions', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'proj_456',
  })
}).then(r => r.json());

const sessionId = session.id;

// 2. Write project files
await fetch(`/api/sandbox/sessions/${sessionId}/files/batch`, {
  method: 'POST',
  body: JSON.stringify({
    files: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'my-app',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: { react: '^18.0.0' }
        })
      },
      {
        path: 'src/App.tsx',
        content: 'import React from "react";\n...'
      }
    ]
  })
});

// 3. Install dependencies
await fetch(`/api/sandbox/sessions/${sessionId}/install`, {
  method: 'POST',
  body: JSON.stringify({
    packageManager: 'npm',
    packages: ['react', 'react-dom']
  })
});

// 4. Run dev server
const { server } = await fetch(
  `/api/sandbox/sessions/${sessionId}/server`,
  {
    method: 'POST',
    body: JSON.stringify({
      command: 'npm run dev',
      port: 3000
    })
  }
).then(r => r.json());

console.log(`Server running at ${server.url}`);

// 5. Run tests
await fetch(`/api/sandbox/sessions/${sessionId}/test`, {
  method: 'POST',
  body: JSON.stringify({ framework: 'jest' })
});

// 6. Build project
await fetch(`/api/sandbox/sessions/${sessionId}/build`, {
  method: 'POST',
  body: JSON.stringify({ buildCommand: 'npm run build' })
});

// 7. Get build output
const { files } = await fetch(
  `/api/sandbox/sessions/${sessionId}/files?path=dist`
).then(r => r.json());

// 8. Cleanup
await fetch(`/api/sandbox/sessions/${sessionId}`, {
  method: 'DELETE'
});
```

### Terminal Emulator Integration

```typescript
class SandboxTerminal {
  private sessionId: string;

  async execute(command: string): Promise<string> {
    const { result } = await fetch(
      `/api/sandbox/sessions/${this.sessionId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({ command, timeout: 30000 })
      }
    ).then(r => r.json());

    return result.stdout + result.stderr;
  }

  async install(packages: string[]): Promise<string> {
    const { result } = await fetch(
      `/api/sandbox/sessions/${this.sessionId}/install`,
      {
        method: 'POST',
        body: JSON.stringify({
          packageManager: 'npm',
          packages
        })
      }
    ).then(r => r.json());

    return result.stdout;
  }
}
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';

function SandboxIDE() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    // Create session on mount
    fetch('/api/sandbox/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser.id,
        projectId: currentProject.id
      })
    })
      .then(r => r.json())
      .then(({ session }) => setSessionId(session.id));

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        fetch(`/api/sandbox/sessions/${sessionId}`, {
          method: 'DELETE'
        });
      }
    };
  }, []);

  const runCommand = async (command: string) => {
    const { result } = await fetch(
      `/api/sandbox/sessions/${sessionId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({ command })
      }
    ).then(r => r.json());

    setOutput(result.stdout + result.stderr);
  };

  return (
    <div>
      <input
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            runCommand(e.currentTarget.value);
          }
        }}
      />
      <pre>{output}</pre>
    </div>
  );
}
```

---

## 🔄 Session Lifecycle

```
┌─────────────┐
│  Create     │  POST /sessions
│  Session    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Initializing│  Setting up workspace
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Ready    │  ◄──┐
│             │     │  POST /execute
└──────┬──────┘     │  POST /files
       │            │
       ▼            │
┌─────────────┐     │
│   Running   │  ───┘  Command executing
└──────┬──────┘
       │
       ├──────────────────┐
       │ Timeout/Expired  │ DELETE /sessions
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   Stopped   │    │   Error     │
└──────┬──────┘    └──────┬──────┘
       │                  │
       └──────┬───────────┘
              ▼
       ┌─────────────┐
       │  Destroyed  │  Cleanup & remove
       └─────────────┘
```

---

## 📊 Monitoring & Limits

### Session Limits

```typescript
{
  maxSessions: 100,           // Total concurrent sessions
  sessionTimeout: 30 * 60000, // 30 minutes
  maxDiskPerSession: 1024**3, // 1 GB
  maxMemoryPerSession: 512,   // 512 MB
  maxCPUPerSession: 1         // 1 core
}
```

### Cleanup Strategy

1. **Automatic Cleanup:**
   - Runs every 5 minutes
   - Removes expired sessions
   - Deletes workspace files
   - Stops Docker containers

2. **Manual Cleanup:**
   - `DELETE /sessions/:id`
   - Immediate destruction
   - Force stop processes

3. **Error Handling:**
   - Failed commands don't destroy session
   - Session marked as 'error' state
   - Can be reused or destroyed

---

## 🎯 Use Cases

### 1. Code Playground

```typescript
// User writes code in browser
// Execute immediately in sandbox
await runInSandbox({
  code: 'console.log("Hello World")',
  language: 'javascript'
});
```

### 2. Tutorial System

```typescript
// Step-by-step tutorials
await createLesson({
  steps: [
    { instruction: 'Install React', command: 'npm install react' },
    { instruction: 'Create component', file: 'App.tsx', content: '...' },
    { instruction: 'Run tests', command: 'npm test' }
  ]
});
```

### 3. Code Review

```typescript
// Reviewer tests PR in sandbox
await checkoutPR(prNumber);
await installDeps();
await runTests();
await startPreview();
```

### 4. CI/CD Pipeline

```typescript
// Run CI checks in sandbox
await runPipeline({
  install: true,
  lint: true,
  test: true,
  build: true
});
```

---

## 🚨 Error Handling

### Common Errors

**Session Not Found:**
```json
{
  "error": "Session not found or expired"
}
```
→ Session expired or invalid ID

**Command Not Allowed:**
```json
{
  "error": "Command not allowed: rm"
}
```
→ Command not in whitelist

**Timeout:**
```json
{
  "result": {
    "error": "Command timed out after 30000ms"
  }
}
```
→ Increase timeout or optimize command

**Resource Limit:**
```json
{
  "error": "Maximum sandbox sessions reached"
}
```
→ Wait or cleanup old sessions

---

## ✅ Benefits

1. **Isolation**
   - User code can't affect server
   - Each user gets own environment
   - Safe for untrusted code

2. **Flexibility**
   - Support multiple languages
   - Any package manager
   - Custom configurations

3. **Scalability**
   - Multiple concurrent users
   - Auto-cleanup expired sessions
   - Resource limits per session

4. **Developer Experience**
   - Instant environment setup
   - No local installation needed
   - Consistent across devices

5. **Security**
   - Command whitelist
   - File system isolation
   - Network isolation (Docker mode)
   - Resource limits

---

## 🎉 Summary

Sandbox system menyediakan:

✅ **Isolated Execution** - Per-user sandboxes
✅ **Resource Control** - CPU/memory/disk limits
✅ **Security** - Command whitelist & file isolation
✅ **Package Management** - npm/yarn/pnpm/bun
✅ **Dev Server** - Start & preview apps
✅ **Git Support** - Initialize, commit, log
✅ **Testing** - Jest/Vitest/Mocha
✅ **Building** - Run build commands
✅ **Auto-Cleanup** - Expired session removal
✅ **Docker Mode** - Enhanced isolation (optional)
✅ **File Operations** - Read/write/batch
✅ **Statistics** - Session monitoring

**Production-ready sandbox environment untuk safe code execution!** 🚀
