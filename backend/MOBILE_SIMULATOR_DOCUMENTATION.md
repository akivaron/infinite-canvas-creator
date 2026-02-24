# Mobile Simulator with Expo Documentation

Isolated mobile development environment untuk testing Expo apps tanpa mempengaruhi server production.

---

## 🎯 Overview

Mobile simulator menyediakan:
- ✅ Expo project initialization
- ✅ Isolated workspace per session
- ✅ Web, iOS, Android simulation
- ✅ Live reload & hot reload
- ✅ QR code untuk device testing
- ✅ Tunnel support untuk external access
- ✅ Build & export functionality
- ✅ Auto-cleanup expired sessions

---

## 📦 API Endpoints

Base URL: `http://localhost:3001/api/mobile`

### Session Management

#### Create Expo Session

```http
POST /api/mobile/sessions
```

**Request:**
```json
{
  "userId": "user_123",
  "projectId": "proj_456",
  "config": {
    "name": "My Expo App",
    "slug": "my-expo-app",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait"
  }
}
```

**Response:**
```json
{
  "session": {
    "id": "expo_abc123",
    "status": "ready",
    "type": "expo",
    "platform": "web",
    "workdir": "/tmp/mobile-sandbox/expo_abc123",
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

#### List Mobile Sessions

```http
GET /api/mobile/sessions?userId=user_123
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "expo_abc123",
      "userId": "user_123",
      "projectId": "proj_456",
      "type": "expo",
      "platform": "web",
      "status": "running",
      "serverUrl": "http://localhost:19000",
      "qrCode": "exp://192.168.1.100:19000",
      "tunnelUrl": "https://xyz.exp.direct:19000",
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-01T01:00:00Z"
    }
  ]
}
```

#### Get Session Details

```http
GET /api/mobile/sessions/:sessionId
```

#### Destroy Session

```http
DELETE /api/mobile/sessions/:sessionId
```

---

### Project Files

#### Write Project Files

```http
POST /api/mobile/sessions/:sessionId/files
```

**Request:**
```json
{
  "files": [
    {
      "path": "App.tsx",
      "content": "import React from 'react';\nimport { View, Text } from 'react-native';\n\nexport default function App() {\n  return (\n    <View>\n      <Text>Hello Expo!</Text>\n    </View>\n  );\n}"
    },
    {
      "path": "components/Button.tsx",
      "content": "import React from 'react';\nimport { TouchableOpacity, Text } from 'react-native';\n\nexport default function Button({ title, onPress }) {\n  return (\n    <TouchableOpacity onPress={onPress}>\n      <Text>{title}</Text>\n    </TouchableOpacity>\n  );\n}"
    }
  ]
}
```

---

### Dependencies

#### Install Dependencies

```http
POST /api/mobile/sessions/:sessionId/install
```

**Request:**
```json
{
  "packageManager": "npm"
}
```

Supports: `npm`, `yarn`, `pnpm`

---

### Development Server

#### Start Expo Server

```http
POST /api/mobile/sessions/:sessionId/start
```

**Request:**
```json
{
  "platform": "web",
  "tunnel": false,
  "lan": false
}
```

**Platforms:**
- `web` - Web browser preview
- `ios` - iOS simulator
- `android` - Android emulator

**Options:**
- `tunnel: true` - Enable ngrok tunnel for external access
- `lan: true` - Enable LAN access

**Response:**
```json
{
  "server": {
    "serverUrl": "http://localhost:19000",
    "qrCode": "exp://192.168.1.100:19000",
    "tunnelUrl": "https://xyz.exp.direct:19000"
  }
}
```

**QR Code Usage:**
1. Install Expo Go app on your device
2. Scan the QR code
3. App opens on your device with live reload

#### Stop Expo Server

```http
POST /api/mobile/sessions/:sessionId/stop
```

---

### Building

#### Build for Platform

```http
POST /api/mobile/sessions/:sessionId/build
```

**Request:**
```json
{
  "platform": "android",
  "profile": "production",
  "local": false
}
```

**Platforms:**
- `ios` - iOS build
- `android` - Android build
- `web` - Web build

**Options:**
- `profile` - Build profile (development, preview, production)
- `local` - Build locally (true) or on EAS (false)

#### Export Project

```http
POST /api/mobile/sessions/:sessionId/export
```

**Request:**
```json
{
  "platform": "web"
}
```

**Response:**
```json
{
  "outputDir": "/tmp/mobile-sandbox/expo_abc123/dist",
  "success": true
}
```

---

### Logs

#### Get Session Logs

```http
GET /api/mobile/sessions/:sessionId/logs?lines=100
```

**Response:**
```json
{
  "logs": [
    "[2024-01-01 00:00:00] Starting Metro bundler...",
    "[2024-01-01 00:00:01] Metro running on port 8081",
    "[2024-01-01 00:00:02] Expo DevTools running on http://localhost:19002"
  ]
}
```

---

## 💻 Usage Examples

### Complete Workflow

```typescript
// 1. Create Expo session
const { session } = await fetch('/api/mobile/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'proj_456',
    config: {
      name: 'My Todo App',
      slug: 'my-todo-app',
      version: '1.0.0',
      platforms: ['ios', 'android', 'web']
    }
  })
}).then(r => r.json());

const sessionId = session.id;

// 2. Write app files
await fetch(`/api/mobile/sessions/${sessionId}/files`, {
  method: 'POST',
  body: JSON.stringify({
    files: [
      {
        path: 'App.tsx',
        content: `
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Button, FlatList } from 'react-native';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');

  const addTodo = () => {
    if (text.trim()) {
      setTodos([...todos, { id: Date.now().toString(), text }]);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Todos</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Enter todo"
      />
      <Button title="Add" onPress={addTodo} />
      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text style={styles.todo}>{item.text}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  todo: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
        `
      }
    ]
  })
});

// 3. Install dependencies
await fetch(`/api/mobile/sessions/${sessionId}/install`, {
  method: 'POST',
  body: JSON.stringify({ packageManager: 'npm' })
});

// 4. Start development server
const { server } = await fetch(`/api/mobile/sessions/${sessionId}/start`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'web',
    tunnel: true
  })
}).then(r => r.json());

console.log(`Web preview: ${server.serverUrl}`);
console.log(`QR code: ${server.qrCode}`);
console.log(`Tunnel: ${server.tunnelUrl}`);

// 5. Build for production
await fetch(`/api/mobile/sessions/${sessionId}/build`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'android',
    profile: 'production'
  })
});

// 6. Export web version
const { outputDir } = await fetch(`/api/mobile/sessions/${sessionId}/export`, {
  method: 'POST',
  body: JSON.stringify({ platform: 'web' })
}).then(r => r.json());

// 7. Cleanup
await fetch(`/api/mobile/sessions/${sessionId}`, {
  method: 'DELETE'
});
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';

function ExpoSimulator({ userId, projectId }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('idle');

  const createSession = async () => {
    setStatus('creating');
    const { session } = await fetch('/api/mobile/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        projectId,
        config: {
          name: 'My App',
          slug: 'my-app',
          version: '1.0.0'
        }
      })
    }).then(r => r.json());

    setSession(session);
    setStatus('ready');
  };

  const startServer = async () => {
    setStatus('starting');
    const { server } = await fetch(
      `/api/mobile/sessions/${session.id}/start`,
      {
        method: 'POST',
        body: JSON.stringify({
          platform: 'web',
          tunnel: true
        })
      }
    ).then(r => r.json());

    setSession({ ...session, ...server });
    setStatus('running');
  };

  const stopServer = async () => {
    await fetch(`/api/mobile/sessions/${session.id}/stop`, {
      method: 'POST'
    });
    setStatus('stopped');
  };

  useEffect(() => {
    return () => {
      if (session) {
        fetch(`/api/mobile/sessions/${session.id}`, {
          method: 'DELETE'
        });
      }
    };
  }, [session]);

  return (
    <div>
      <h2>Expo Simulator</h2>
      <p>Status: {status}</p>

      {!session && (
        <button onClick={createSession}>Create Session</button>
      )}

      {session && status === 'ready' && (
        <button onClick={startServer}>Start Server</button>
      )}

      {status === 'running' && (
        <>
          <button onClick={stopServer}>Stop Server</button>
          <div>
            <p>Server URL: {session.serverUrl}</p>
            <p>QR Code: {session.qrCode}</p>
            {session.tunnelUrl && (
              <p>Tunnel: {session.tunnelUrl}</p>
            )}
            <iframe
              src={session.serverUrl}
              style={{ width: '375px', height: '667px', border: '1px solid #ccc' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 🔒 Security & Limits

### Session Limits
- Max sessions: 50 concurrent
- Session timeout: 1 hour
- Auto-cleanup expired sessions
- Port range: 19000-20000

### File System
- Isolated workspace per session
- No access to parent directories
- Auto-cleanup on destroy

### Network
- LAN mode: Local network only
- Tunnel mode: Public URL via ngrok
- Configurable per session

---

## 🎯 Use Cases

### 1. Live Preview

```typescript
// Instant preview while coding
const preview = async (code: string) => {
  await writeFile(sessionId, 'App.tsx', code);
  // Expo auto-reloads with changes
};
```

### 2. Device Testing

```typescript
// Generate QR for device testing
const { qrCode } = await startServer(sessionId, {
  platform: 'android',
  tunnel: true
});
// User scans QR with Expo Go app
```

### 3. Cross-Platform Development

```typescript
// Test on multiple platforms
await startServer(sessionId, { platform: 'web' });
await startServer(sessionId, { platform: 'ios' });
await startServer(sessionId, { platform: 'android' });
```

### 4. Production Builds

```typescript
// Build for app stores
await build(sessionId, {
  platform: 'ios',
  profile: 'production'
});
await build(sessionId, {
  platform: 'android',
  profile: 'production'
});
```

---

## 📝 Configuration

### Environment Variables

```bash
# Mobile simulator config
MOBILE_SANDBOX_DIR=/tmp/mobile-sandbox
MOBILE_BASE_PORT=19000
MAX_MOBILE_SESSIONS=50
```

---

## ✅ Benefits

1. **Instant Preview** - Live reload on code changes
2. **Device Testing** - QR code for real device testing
3. **Cross-Platform** - Web, iOS, Android support
4. **Isolated** - Per-user sandboxes
5. **No Setup** - Zero installation required
6. **Cloud Ready** - Tunnel support for remote access

---

## 🎉 Summary

Mobile simulator provides:
- ✅ Expo project initialization
- ✅ Live development server
- ✅ QR code device testing
- ✅ Tunnel for external access
- ✅ Multi-platform builds
- ✅ Auto-cleanup
- ✅ Isolated environments

**Production-ready mobile development environment!** 🚀
