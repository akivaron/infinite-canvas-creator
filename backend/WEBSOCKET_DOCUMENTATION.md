# WebSocket Real-Time Communication

Complete documentation for WebSocket integration in AI Canvas Platform.

---

## 🌐 Overview

The WebSocket server provides real-time bidirectional communication between backend and frontend, enabling instant notifications when AI processes complete, progress updates, and error notifications.

**WebSocket URL:**
```
ws://localhost:3001/ws
```

**Production URL:**
```
wss://api.aicanvas.com/ws
```

---

## 🔌 Connection

### Connection URL Format

```
ws://localhost:3001/ws?userId=USER_ID&sessionId=SESSION_ID
```

**Query Parameters:**
- `userId` (optional): User identifier for user-specific notifications
- `sessionId` (optional): Session identifier for session-specific notifications

### JavaScript Connection Example

```typescript
const ws = new WebSocket('ws://localhost:3001/ws?sessionId=my_session_123');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

---

## 📨 Message Format

All messages are JSON formatted:

```typescript
{
  type: string;        // Message type
  timestamp: string;   // ISO timestamp
  [key: string]: any;  // Additional data
}
```

---

## 📤 Client → Server Messages

### 1. Ping

Manually ping the server to check connection.

```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Subscribe

Subscribe to specific session notifications.

```json
{
  "type": "subscribe",
  "sessionId": "session_123"
}
```

**Response:**
```json
{
  "type": "subscribed",
  "sessionId": "session_123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 3. Unsubscribe

Unsubscribe from session notifications.

```json
{
  "type": "unsubscribe"
}
```

**Response:**
```json
{
  "type": "unsubscribed",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 📥 Server → Client Messages

### 1. Connection Established

Sent immediately after connection.

```json
{
  "type": "connection",
  "status": "connected",
  "clientId": "client_1234567890_abc123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. AI Processing Started

Notification when AI agent starts processing.

```json
{
  "type": "ai_start",
  "sessionId": "session_123",
  "task": {
    "prompt": "Create a React component",
    "mode": "generate",
    "targetFile": "src/Component.tsx"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 3. AI Progress Update

Periodic progress updates during AI processing.

```json
{
  "type": "ai_progress",
  "sessionId": "session_123",
  "progress": {
    "chunksReceived": 25,
    "contentLength": 1250
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 4. AI Processing Complete

Notification when AI finishes processing.

```json
{
  "type": "ai_complete",
  "sessionId": "session_123",
  "result": {
    "mode": "generate",
    "contentLength": 5000,
    "chunks": 100,
    "targetFile": "src/Component.tsx"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 5. AI Error

Notification when AI encounters an error.

```json
{
  "type": "ai_error",
  "sessionId": "session_123",
  "error": {
    "message": "API rate limit exceeded",
    "type": "rate_limit_error"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🎯 Use Cases

### 1. Real-Time AI Notifications

Monitor AI processing in real-time:

```typescript
const ws = new WebSocket('ws://localhost:3001/ws?sessionId=my_session');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'ai_start':
      console.log('AI started processing');
      showLoadingIndicator();
      break;

    case 'ai_progress':
      console.log('Progress:', message.progress);
      updateProgressBar(message.progress);
      break;

    case 'ai_complete':
      console.log('AI completed!', message.result);
      hideLoadingIndicator();
      showSuccessNotification();
      break;

    case 'ai_error':
      console.error('AI error:', message.error);
      hideLoadingIndicator();
      showErrorNotification(message.error.message);
      break;
  }
};
```

---

### 2. Multi-User Collaboration

Receive updates from other users working on the same session:

```typescript
const ws = new WebSocket('ws://localhost:3001/ws?userId=user123&sessionId=shared_session');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'ai_complete') {
    refreshSharedCanvas();
    notifyUser('AI agent completed task');
  }
};
```

---

### 3. Background Processing Notifications

Get notified when long-running background tasks complete:

```typescript
// Start AI task
fetch('/api/agent/generate', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'background_task_123',
    prompt: 'Generate documentation',
    // ... other params
  })
});

// Listen for completion
const ws = new WebSocket('ws://localhost:3001/ws?sessionId=background_task_123');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'ai_complete') {
    console.log('Background task completed!');
    fetchGeneratedDocumentation();
  }
};
```

---

## ⚛️ React Hook

### useWebSocket Hook

```typescript
import { useWebSocket } from '@/hooks/use-websocket';

function MyComponent() {
  const { isConnected, send, lastMessage } = useWebSocket({
    sessionId: 'my_session',
    onMessage: (message) => {
      console.log('Received:', message);
    }
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => send({ type: 'ping' })}>
        Ping Server
      </button>
    </div>
  );
}
```

---

### useAIWebSocket Hook

Specialized hook for AI notifications:

```typescript
import { useAIWebSocket } from '@/hooks/use-websocket';

function AIComponent() {
  const {
    isConnected,
    aiStatus,
    aiProgress,
    aiResult,
    aiError,
    subscribe,
  } = useAIWebSocket('my_session');

  useEffect(() => {
    if (aiStatus === 'complete') {
      console.log('AI completed:', aiResult);
      // Handle completion
    }
  }, [aiStatus, aiResult]);

  return (
    <div>
      <p>Connection: {isConnected ? '✓' : '✗'}</p>
      <p>AI Status: {aiStatus}</p>

      {aiProgress && (
        <p>Progress: {aiProgress.chunksReceived} chunks</p>
      )}

      {aiResult && (
        <div>Result: {JSON.stringify(aiResult)}</div>
      )}

      {aiError && (
        <div className="error">{aiError.message}</div>
      )}
    </div>
  );
}
```

---

## 🔧 Server-Side API

### WebSocketManager Class

```typescript
import { getWebSocketManager } from './config/websocket.js';

const wsManager = getWebSocketManager();

// Notify specific session
wsManager.notifyAIComplete(sessionId, {
  mode: 'generate',
  contentLength: 5000,
  chunks: 100
});

// Notify progress
wsManager.notifyAIProgress(sessionId, {
  chunksReceived: 25,
  contentLength: 1250
});

// Notify error
wsManager.notifyAIError(sessionId, {
  message: 'Rate limit exceeded',
  type: 'rate_limit_error'
});

// Notify start
wsManager.notifyAIStart(sessionId, {
  prompt: 'Create component',
  mode: 'generate'
});

// Broadcast to all users
wsManager.broadcastToUser(userId, {
  type: 'notification',
  message: 'New update available'
});

// Get stats
const stats = wsManager.getStats();
console.log(`Active connections: ${stats.activeConnections}`);
```

---

## 🔒 Connection Management

### Heartbeat / Keep-Alive

The server automatically sends ping frames every 30 seconds to keep connections alive.

```typescript
// Server automatically handles this
setInterval(() => {
  clients.forEach((client) => {
    if (!client.isAlive) {
      client.ws.terminate();
      return;
    }
    client.isAlive = false;
    client.ws.ping();
  });
}, 30000);
```

### Automatic Reconnection

The frontend hook automatically reconnects on connection loss:

```typescript
const ws = useWebSocket({
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
});
```

---

## 📊 WebSocket Stats Endpoint

Get real-time WebSocket statistics:

**Endpoint:** `GET /api/ws/stats`

**Response:**
```json
{
  "totalConnections": 15,
  "activeConnections": 12,
  "clients": [
    {
      "id": "client_1234567890_abc123",
      "userId": "user_123",
      "sessionId": "session_456",
      "isAlive": true,
      "state": 1
    }
  ]
}
```

**WebSocket States:**
- `0` - CONNECTING
- `1` - OPEN
- `2` - CLOSING
- `3` - CLOSED

---

## 🔐 Security

### Authentication

Currently, WebSocket connections accept optional `userId` and `sessionId` parameters. For production:

1. **JWT Authentication:**
```typescript
const token = localStorage.getItem('auth_token');
const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);
```

2. **Session Validation:**
```typescript
// Server-side validation
ws.on('connection', (ws, req) => {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');

  if (!isValidToken(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // Continue with connection...
});
```

---

## 🧪 Testing

### Manual Testing with wscat

Install wscat:
```bash
npm install -g wscat
```

Connect:
```bash
wscat -c "ws://localhost:3001/ws?sessionId=test_123"
```

Send messages:
```
> {"type":"ping"}
< {"type":"pong","timestamp":"2024-01-01T00:00:00.000Z"}

> {"type":"subscribe","sessionId":"test_123"}
< {"type":"subscribed","sessionId":"test_123","timestamp":"2024-01-01T00:00:00.000Z"}
```

---

### JavaScript Testing

```typescript
const testWebSocket = () => {
  const ws = new WebSocket('ws://localhost:3001/ws?sessionId=test');

  ws.onopen = () => {
    console.log('✓ Connected');

    // Test ping
    ws.send(JSON.stringify({ type: 'ping' }));

    // Test subscribe
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId: 'test_session'
      }));
    }, 1000);
  };

  ws.onmessage = (event) => {
    console.log('✓ Received:', event.data);
  };

  ws.onerror = (error) => {
    console.error('✗ Error:', error);
  };

  ws.onclose = () => {
    console.log('✗ Disconnected');
  };
};

testWebSocket();
```

---

## 🚀 Performance

### Connection Pooling

The server maintains a connection pool with automatic cleanup:

```typescript
{
  clientTracking: true,
  maxPayload: 100 * 1024 * 1024, // 100MB
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
}
```

### Message Batching

For high-frequency updates, consider batching:

```typescript
let messageQueue = [];

setInterval(() => {
  if (messageQueue.length > 0) {
    wsManager.broadcastToSession(sessionId, {
      type: 'batch_update',
      messages: messageQueue
    });
    messageQueue = [];
  }
}, 100); // Batch every 100ms
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connect ECONNREFUSED
```
Solution: Ensure backend server is running on port 3001.

**2. Connection Timeout**
```
Error: WebSocket connection timeout
```
Solution: Check firewall settings and CORS configuration.

**3. Messages Not Received**
```
No messages received after ai_start
```
Solution: Ensure sessionId matches between API call and WebSocket connection.

**4. Frequent Reconnections**
```
Reconnecting... (attempt 1/10)
```
Solution: Check network stability and server logs.

### Debug Mode

Enable verbose logging:

```typescript
const ws = useWebSocket({
  sessionId: 'my_session',
  onOpen: () => console.log('[WS] Connected'),
  onClose: () => console.log('[WS] Disconnected'),
  onError: (error) => console.error('[WS] Error:', error),
  onMessage: (msg) => console.log('[WS] Message:', msg)
});
```

---

## 📈 Monitoring

### Server-Side Logging

```typescript
// Connection logs
console.log(`✓ WebSocket client connected: ${clientId} (Total: ${clients.size})`);
console.log(`✗ WebSocket client disconnected: ${clientId} (Total: ${clients.size})`);

// Message logs
console.log(`Received message from ${clientId}:`, message.type);
console.log(`✓ AI completion notification sent to ${sentCount} client(s)`);
```

### Metrics

Track WebSocket metrics:

```typescript
const metrics = {
  totalConnections: wsManager.getStats().totalConnections,
  activeConnections: wsManager.getStats().activeConnections,
  messagesSent: messageCounter,
  messagesReceived: receivedCounter,
  reconnectAttempts: reconnectCounter,
  averageLatency: latencySum / latencyCount
};
```

---

## 🎉 Summary

**WebSocket Features:**
- ✅ Real-time bidirectional communication
- ✅ Automatic reconnection
- ✅ Session-based notifications
- ✅ User-based notifications
- ✅ AI progress tracking
- ✅ Error notifications
- ✅ Heartbeat/keep-alive
- ✅ Connection stats API
- ✅ React hooks ready
- ✅ TypeScript support

**Event Types:**
- `connection` - Initial connection
- `ai_start` - AI processing started
- `ai_progress` - Progress updates
- `ai_complete` - Processing complete
- `ai_error` - Error occurred
- `ping/pong` - Heartbeat
- `subscribe/unsubscribe` - Session management

**Usage:**
```typescript
// Frontend
const { aiStatus, aiResult } = useAIWebSocket(sessionId);

// Backend
wsManager.notifyAIComplete(sessionId, result);
```

**WebSocket ready untuk production dengan complete real-time notifications!** 🚀
