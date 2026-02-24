# Complete API Reference

## Base URL
```
http://localhost:3001
```

## Core Agent Endpoints

### 1. Generate Code
**POST** `/api/agent/generate`

Generate code dengan streaming support.

**Request:**
```json
{
  "prompt": "Create a todo app with React",
  "context": {
    "currentFile": {
      "path": "src/App.tsx",
      "content": "...",
      "language": "typescriptreact"
    },
    "relatedFiles": [],
    "projectStructure": {
      "files": [],
      "directories": [],
      "dependencies": {}
    },
    "recentChanges": []
  },
  "mode": "generate" | "edit" | "complete" | "explain",
  "targetFile": "src/App.tsx",
  "apiKey": "your-openrouter-key",
  "model": "anthropic/claude-3.5-sonnet"
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"type":"progress","data":{"message":"Analyzing...","phase":"analyzing"}}
data: {"type":"progress","data":{"message":"Generating...","phase":"generating"}}
data: {"type":"complete","data":{...}}
data: [DONE]
```

### 2. Code Completion
**POST** `/api/agent/complete`

**Request:**
```json
{
  "prompt": "const handle",
  "context": {...},
  "position": { "line": 10, "character": 15 },
  "apiKey": "your-key"
}
```

### 3. Code Explanation
**POST** `/api/agent/explain`

**Request:**
```json
{
  "code": "const [state, setState] = useState(0);",
  "context": {...},
  "apiKey": "your-key"
}
```

### 4. Analyze Context
**POST** `/api/agent/analyze-context`

**Request:**
```json
{
  "files": [
    { "path": "src/App.tsx", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "files": [...],
  "projectStructure": {
    "files": [...],
    "directories": [...],
    "dependencies": {...},
    "framework": "react",
    "language": "typescript"
  }
}
```

### 5. Improve Prompt
**POST** `/api/agent/improve-prompt`

**Request:**
```json
{
  "prompt": "create a todo app",
  "platform": "web",
  "apiKey": "your-key"
}
```

**Response:**
```json
{
  "improvedPrompt": "Create a modern, responsive...",
  "caption": "Modern Todo Manager"
}
```

## Advanced Features

### AST Analysis

#### Analyze AST
**POST** `/api/advanced/analyze-ast`

**Request:**
```json
{
  "filePath": "src/App.tsx",
  "content": "export const App = () => {...}",
  "language": "typescriptreact"
}
```

**Response:**
```json
{
  "structure": {
    "symbols": [
      {
        "name": "App",
        "type": "function",
        "line": 1,
        "column": 13,
        "scope": "export"
      }
    ],
    "imports": [...],
    "exports": [...],
    "dependencies": [...],
    "complexity": 5,
    "linesOfCode": 50
  }
}
```

### Symbol Resolution

#### Find Definition
**POST** `/api/advanced/find-definition`

**Request:**
```json
{
  "symbolName": "Button",
  "currentFile": "src/App.tsx"
}
```

**Response:**
```json
{
  "definition": {
    "filePath": "src/components/Button.tsx",
    "line": 5,
    "column": 13,
    "symbol": {...}
  }
}
```

#### Find References
**POST** `/api/advanced/find-references`

**Request:**
```json
{
  "symbolName": "Button"
}
```

**Response:**
```json
{
  "references": [
    {
      "symbol": {...},
      "filePath": "src/components/Button.tsx",
      "usages": [...]
    }
  ]
}
```

### Change Detection

#### Detect Changes
**POST** `/api/advanced/detect-changes`

**Request:**
```json
{
  "files": [
    { "path": "src/App.tsx", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "changes": [
    {
      "path": "src/App.tsx",
      "type": "modified",
      "timestamp": 1234567890,
      "oldContent": "...",
      "newContent": "..."
    }
  ],
  "recentChanges": [...],
  "patterns": [
    {
      "pattern": "Frequently modifying tsx files",
      "confidence": 0.8
    }
  ],
  "velocity": 5
}
```

### Refactoring

#### Rename Symbol
**POST** `/api/advanced/refactor/rename`

**Request:**
```json
{
  "files": [...],
  "targetFile": "src/App.tsx",
  "oldName": "oldFunction",
  "newName": "newFunction",
  "scope": "project" | "file"
}
```

**Response:**
```json
{
  "operation": {
    "type": "rename",
    "files": [
      {
        "path": "src/App.tsx",
        "oldContent": "...",
        "newContent": "...",
        "diff": "..."
      }
    ],
    "description": "Renamed oldFunction to newFunction"
  }
}
```

#### Extract Function
**POST** `/api/advanced/refactor/extract`

**Request:**
```json
{
  "file": { "path": "...", "content": "..." },
  "name": "handleSubmit",
  "startLine": 10,
  "endLine": 20,
  "extractTo": "function" | "component" | "hook"
}
```

#### Move Symbols
**POST** `/api/advanced/refactor/move`

**Request:**
```json
{
  "files": [...],
  "sourceFile": "src/utils.ts",
  "symbols": ["formatDate", "parseDate"],
  "targetFile": "src/dateUtils.ts"
}
```

### Code Search

#### Text Search
**POST** `/api/advanced/search/text`

**Request:**
```json
{
  "files": [...],
  "query": "useState",
  "options": {
    "caseSensitive": false,
    "wholeWord": true,
    "regex": false,
    "filePattern": "*.tsx"
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "file": "src/App.tsx",
      "line": 5,
      "column": 10,
      "match": "useState",
      "context": "...",
      "score": 95
    }
  ]
}
```

#### Symbol Search
**POST** `/api/advanced/search/symbol`

**Request:**
```json
{
  "files": [...],
  "symbolName": "Button",
  "symbolType": "component"
}
```

#### Semantic Search
**POST** `/api/advanced/search/semantic`

**Request:**
```json
{
  "files": [...],
  "query": "authentication function",
  "structures": {...}
}
```

#### Fuzzy Search
**POST** `/api/advanced/search/fuzzy`

**Request:**
```json
{
  "files": [...],
  "query": "btn comp",
  "maxResults": 10
}
```

#### Find TODOs
**POST** `/api/advanced/search/todos`

**Request:**
```json
{
  "files": [...]
}
```

**Response:**
```json
{
  "results": [
    {
      "file": "src/App.tsx",
      "line": 15,
      "match": "// TODO: Implement this",
      "context": "..."
    }
  ]
}
```

### Conversation Memory

#### Create Session
**POST** `/api/advanced/conversation/create`

**Request:**
```json
{
  "sessionId": "sess_123",
  "projectId": "proj_456"
}
```

**Response:**
```json
{
  "context": {
    "sessionId": "sess_123",
    "projectId": "proj_456",
    "turns": [],
    "recentFiles": [],
    "userPreferences": {},
    "learnings": []
  }
}
```

#### Add Turn
**POST** `/api/advanced/conversation/add-turn`

**Request:**
```json
{
  "sessionId": "sess_123",
  "request": {...},
  "response": {...}
}
```

#### Add Feedback
**POST** `/api/advanced/conversation/feedback`

**Request:**
```json
{
  "sessionId": "sess_123",
  "turnId": "turn_789",
  "feedback": "positive" | "negative"
}
```

#### Get Context
**GET** `/api/advanced/conversation/:sessionId/context`

**Response:**
```json
{
  "prompt": "# Conversation History\n...",
  "stats": {
    "totalTurns": 15,
    "appliedTurns": 12,
    "positiveFeedback": 10,
    "negativeFeedback": 2,
    "mostUsedMode": "edit"
  }
}
```

### Terminal Execution

#### Execute Command
**POST** `/api/advanced/terminal/execute`

**Request:**
```json
{
  "command": "npm test",
  "options": {
    "cwd": "./project",
    "timeout": 30000,
    "env": { "NODE_ENV": "test" }
  }
}
```

**Response:**
```json
{
  "result": {
    "stdout": "...",
    "stderr": "...",
    "exitCode": 0,
    "duration": 1234
  }
}
```

#### Install Dependency
**POST** `/api/advanced/terminal/install`

**Request:**
```json
{
  "packageName": "axios",
  "dev": false,
  "manager": "npm" | "yarn" | "pnpm" | "bun"
}
```

#### Run Script
**POST** `/api/advanced/terminal/run-script`

**Request:**
```json
{
  "scriptName": "build",
  "manager": "npm"
}
```

#### Get History
**GET** `/api/advanced/terminal/history?limit=10`

**Response:**
```json
{
  "history": [
    {
      "command": "npm test",
      "timestamp": 1234567890,
      "result": {...}
    }
  ]
}
```

#### Get Scripts
**GET** `/api/advanced/terminal/scripts`

**Response:**
```json
{
  "scripts": ["dev", "build", "test", "lint"],
  "manager": "npm"
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad Request (validation error)
- 404: Not Found
- 500: Internal Server Error

## Authentication

Most endpoints require an OpenRouter API key passed in the request body:

```json
{
  "apiKey": "your-openrouter-api-key"
}
```

## Rate Limiting

Currently no rate limiting, but can be added using middleware.

## CORS

CORS is enabled for:
```
Origin: http://localhost:5173 (configurable via CORS_ORIGIN env)
```

## Streaming Responses

Endpoints that return Server-Sent Events (SSE):
- `/api/agent/generate`
- `/api/agent/complete`

**Usage:**
```javascript
const response = await fetch('/api/agent/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request)
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data);
    }
  }
}
```

## Testing with cURL

### Generate Code
```bash
curl -X POST http://localhost:3001/api/agent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a button component",
    "context": {...},
    "mode": "generate",
    "apiKey": "your-key"
  }'
```

### Analyze AST
```bash
curl -X POST http://localhost:3001/api/advanced/analyze-ast \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "test.ts",
    "content": "const x = 1;",
    "language": "typescript"
  }'
```

### Find Definition
```bash
curl -X POST http://localhost:3001/api/advanced/find-definition \
  -H "Content-Type: application/json" \
  -d '{
    "symbolName": "Button",
    "currentFile": "src/App.tsx"
  }'
```

### Execute Terminal Command
```bash
curl -X POST http://localhost:3001/api/advanced/terminal/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "npm --version"
  }'
```

## Best Practices

1. **Context Building**: Always provide rich context for better results
2. **Error Handling**: Handle both HTTP errors and API errors
3. **Streaming**: Use streaming for real-time feedback
4. **Caching**: Cache AST structures and symbol indexes
5. **Security**: Validate all inputs, never expose secrets
6. **Rate Limiting**: Implement rate limiting in production
7. **Logging**: Log all requests for debugging
8. **Monitoring**: Monitor API performance and errors
