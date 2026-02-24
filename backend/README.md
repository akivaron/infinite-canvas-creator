# Infinite Canvas Backend - AI Code Generation Agent

Backend server for the Infinite Canvas IDE with Cursor-like AI capabilities.

## Features

### 1. Context-Aware Code Generation
- Analyzes entire project structure
- Understands file dependencies and imports
- Maintains coding patterns and conventions
- Uses related files for better context

### 2. Intelligent Code Completion
- Real-time code suggestions
- Context-aware completions
- Matches surrounding code style
- Fast streaming responses

### 3. Incremental Updates
- Generates precise diffs
- Makes minimal focused changes
- Preserves existing functionality
- Smart edit detection

### 4. Code Explanation
- Explains code clearly
- Highlights key concepts
- Context-aware explanations
- Educational insights

### 5. Prompt Improvement
- Automatically enhances prompts
- Adds technical details
- Clarifies requirements
- Generates project titles

## API Endpoints

### POST /api/agent/generate
Generate new code or full projects with streaming response.

**Request:**
```json
{
  "prompt": "Create a todo app with React",
  "context": {
    "currentFile": { "path": "src/App.tsx", "content": "...", "language": "typescriptreact" },
    "relatedFiles": [],
    "projectStructure": { "files": [], "directories": [], "dependencies": {} },
    "recentChanges": []
  },
  "mode": "generate",
  "apiKey": "your-openrouter-key",
  "model": "anthropic/claude-3.5-sonnet"
}
```

**Response:** Server-Sent Events (SSE) stream

### POST /api/agent/complete
Intelligent code completion at cursor position.

**Request:**
```json
{
  "prompt": "const handle",
  "context": { ... },
  "position": { "line": 10, "character": 15 },
  "apiKey": "your-openrouter-key"
}
```

### POST /api/agent/explain
Explain code with context awareness.

**Request:**
```json
{
  "code": "const [state, setState] = useState(0);",
  "context": { ... },
  "apiKey": "your-openrouter-key"
}
```

### POST /api/agent/analyze-context
Analyze project files and extract context.

**Request:**
```json
{
  "files": [
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/utils.ts", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "files": [ ... analyzed files with imports/exports ... ],
  "projectStructure": {
    "files": [ ... ],
    "directories": [ ... ],
    "dependencies": { ... },
    "framework": "react",
    "language": "typescript"
  }
}
```

### POST /api/agent/improve-prompt
Improve user prompts for better results.

**Request:**
```json
{
  "prompt": "create a todo app",
  "platform": "web",
  "apiKey": "your-openrouter-key"
}
```

**Response:**
```json
{
  "improvedPrompt": "Create a modern, responsive todo application...",
  "caption": "Modern Todo Manager"
}
```

## Installation

```bash
cd backend
npm install
```

## Configuration

Create `.env` file:

```env
PORT=3001
NODE_ENV=development

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

OPENROUTER_API_KEY=your_openrouter_api_key

CORS_ORIGIN=http://localhost:5173
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Architecture

### Services

#### ContextAnalyzer
- Detects file language
- Extracts imports and exports
- Finds related files
- Builds project structure
- Creates context prompts

#### CodeAgent
- Manages AI generation
- Streaming responses
- Multiple modes (generate/edit/complete/explain)
- Context-aware prompts
- Error handling

#### DiffGenerator
- Line-by-line diffs
- Inline word diffs
- Unified diff format
- Smart patch application
- Change summarization

### Database Tables

#### agent_sessions
Stores active coding sessions with context.

#### agent_generations
Logs all generation requests and responses.

#### code_context_cache
Caches file analysis for performance.

## Cursor-Like Features

### 1. Full Project Context
Like Cursor, the agent understands your entire codebase:
- Analyzes all files
- Tracks dependencies
- Understands framework patterns
- Maintains consistency

### 2. Incremental Edits
Makes precise changes like Cursor:
- Generates diffs, not full rewrites
- Preserves existing code
- Minimal changes
- Clear change tracking

### 3. Smart Completions
Context-aware suggestions:
- Understands cursor position
- Knows surrounding code
- Matches code style
- Fast streaming

### 4. Code Understanding
Deep comprehension:
- Explains code clearly
- Understands patterns
- Provides context
- Educational insights

## Performance

- Streaming responses for real-time feedback
- Context caching for faster analysis
- Efficient diff generation
- Optimized API calls

## Models Supported

Works with any OpenRouter model:
- anthropic/claude-3.5-sonnet (recommended)
- anthropic/claude-3-opus
- openai/gpt-4-turbo
- google/gemini-pro
- meta-llama/llama-3.1-70b

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Test generation
curl -X POST http://localhost:3001/api/agent/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create hello world","context":{...},"mode":"generate","apiKey":"..."}'
```

## Integration

Frontend integration example:

```typescript
const response = await fetch('http://localhost:3001/api/agent/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Create a button component',
    context: buildContext(),
    mode: 'generate',
    apiKey: openRouterKey,
  }),
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

## License

MIT
