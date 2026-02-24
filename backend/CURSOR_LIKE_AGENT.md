# Building a Cursor-Like AI Code Agent

This document explains how the agent is tuned to work like Cursor AI with context awareness and intelligent code generation.

## Core Principles

### 1. Full Context Awareness

Like Cursor, the agent understands your entire codebase:

**Project Structure Analysis:**
```typescript
{
  files: ['src/App.tsx', 'src/utils.ts', ...],
  directories: ['src/', 'src/components/', ...],
  dependencies: {
    'react': '^18.0.0',
    'typescript': '^5.0.0',
    ...
  },
  framework: 'react',
  language: 'typescript'
}
```

**File Dependency Graph:**
- Extracts imports from each file
- Extracts exports from each file
- Finds related files based on shared dependencies
- Builds a dependency graph

**Recent Changes Tracking:**
- Tracks file modifications
- Stores diffs for recent changes
- Provides temporal context
- Helps understand development flow

### 2. Smart System Prompts

The agent uses dynamic system prompts based on context:

```typescript
buildSystemPrompt(request: GenerationRequest): string {
  const contextPrompt = this.contextAnalyzer.buildContextPrompt(request.context);

  let basePrompt = `You are an expert software engineer AI assistant, similar to Cursor AI.

${contextPrompt}

# Your Capabilities
1. Context-Aware: You understand the entire project structure
2. Incremental Updates: You can make precise edits
3. Best Practices: You follow modern standards
4. Type Safety: You prioritize type safety
5. Consistent Style: You match existing code style
`;

  // Add mode-specific instructions
  if (request.mode === 'edit') {
    basePrompt += MODE_SPECIFIC_INSTRUCTIONS;
  }

  return basePrompt;
}
```

### 3. Context Building

The agent builds rich context for every request:

**Current File Context:**
```typescript
{
  path: 'src/components/Button.tsx',
  content: '...',
  language: 'typescriptreact',
  imports: ['react', './styles', '../utils'],
  exports: ['Button', 'ButtonProps']
}
```

**Related Files:**
- Files that import the current file
- Files imported by the current file
- Files with shared dependencies
- Limited to top 5 most relevant

**Project Context:**
```
# Project Context

Framework: react
Language: typescript

## Project Structure
Files: 45
Key directories: src, src/components, src/utils, src/hooks, src/lib

## Current File: src/components/Button.tsx
Language: typescriptreact
Imports: react, ./styles, ../utils

## Related Files (3)
- src/components/Form.tsx
- src/utils/classNames.ts
- src/styles/button.css
```

## Cursor-Like Features Implementation

### 1. Incremental Edits (Diff-Based Updates)

Instead of regenerating entire files, generate precise diffs:

```typescript
class DiffGenerator {
  generateDiff(oldContent: string, newContent: string): string {
    const changes = diffLines(oldContent, newContent);
    return this.formatUnifiedDiff(changes);
  }
}
```

**Output:**
```diff
  import React from 'react';
- export const Button = () => {
+ export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
    return (
-     <button>Click me</button>
+     <button onClick={onClick}>{children}</button>
    );
  };
```

### 2. Smart Code Completion

Context-aware completions at cursor position:

```typescript
async complete(prompt: string, position: Position, context: CodeContext) {
  const request: GenerationRequest = {
    prompt: `Complete this code: ${prompt}`,
    context,
    mode: 'complete',
    selectionRange: { start: position, end: position }
  };

  // Agent understands:
  // - Current line content
  // - Surrounding code
  // - File imports
  // - Project patterns
}
```

### 3. Multi-Mode Operation

Different modes for different tasks:

**Generate Mode:**
- Create new files from scratch
- Full project generation
- Complete implementations

**Edit Mode:**
- Modify existing code
- Preserve structure
- Minimal changes

**Complete Mode:**
- Code suggestions
- Context-aware completions
- Fast inline suggestions

**Explain Mode:**
- Code explanations
- Concept clarification
- Educational insights

### 4. Streaming Responses

Real-time feedback like Cursor:

```typescript
async *generate(request: GenerationRequest): AsyncGenerator<StreamChunk> {
  yield { type: 'progress', data: { message: 'Analyzing context...', phase: 'analyzing' } };

  yield { type: 'progress', data: { message: 'Generating code...', phase: 'generating' } };

  // Stream AI response in real-time
  for await (const chunk of aiStream) {
    yield { type: 'progress', data: { message: chunk, phase: 'streaming' } };
  }

  yield { type: 'complete', data: result };
}
```

## Advanced Techniques

### 1. Code Pattern Recognition

The agent learns patterns from your codebase:

```typescript
// Detects patterns like:
- Component structure (functional vs class)
- Import organization
- Naming conventions
- Error handling patterns
- Type definitions style
```

### 2. Framework-Aware Generation

Adapts to your framework:

```typescript
if (projectStructure.framework === 'react') {
  // Use React patterns: hooks, JSX, props
} else if (projectStructure.framework === 'vue') {
  // Use Vue patterns: composition API, templates
}
```

### 3. Type Safety Priority

Prioritizes TypeScript and type safety:

```typescript
// Always includes:
- Proper type annotations
- Interface definitions
- Generic types where appropriate
- No 'any' types unless necessary
```

### 4. Import Resolution

Intelligently resolves imports:

```typescript
// Checks for existing utilities
if (projectHasUtil('classNames')) {
  generateCode("import { cn } from '@/lib/utils';");
} else {
  generateCode("import clsx from 'clsx';");
}
```

## Performance Optimizations

### 1. Context Caching

```typescript
// Cache file analysis
cache.set(fileHash, {
  imports: [...],
  exports: [...],
  dependencies: [...],
  analyzedAt: Date.now()
});
```

### 2. Streaming for Speed

- Start responding immediately
- Progressive rendering
- Better user experience
- Reduced perceived latency

### 3. Selective Context

- Limit related files to top 5
- Truncate file contents when needed
- Focus on relevant sections
- Balance context vs token usage

## Prompt Engineering

### System Prompt Structure

```
[Role Definition]
You are an expert software engineer AI assistant, similar to Cursor AI.

[Project Context]
Framework: react
Language: typescript
Files: 45
Dependencies: react, typescript, vite

[Current File Context]
File: src/components/Button.tsx
Imports: react, ./styles
Exports: Button, ButtonProps

[Related Files Context]
- src/utils/classNames.ts
- src/styles/button.css

[Mode-Specific Instructions]
# Mode: EDIT
- Make minimal, focused changes
- Preserve existing functionality
- Return only modified code

[Capabilities & Guidelines]
- Context-aware: understand full project
- Best practices: follow modern standards
- Type safety: prioritize types
- Consistent style: match existing code
```

### User Prompt Structure

```
[User Request]
Add a loading state to the Button component

[Current Code]
```tsx
export const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

[Selection Range]
Lines 1-3

[Related Context]
// Show relevant related files if needed
```

## Comparison with Cursor

| Feature | Cursor | This Agent | Status |
|---------|--------|------------|--------|
| Full codebase awareness | ✓ | ✓ | Implemented |
| Incremental edits | ✓ | ✓ | Implemented |
| Real-time streaming | ✓ | ✓ | Implemented |
| Code completion | ✓ | ✓ | Implemented |
| Diff generation | ✓ | ✓ | Implemented |
| Multi-file edits | ✓ | ✓ | Implemented |
| Framework detection | ✓ | ✓ | Implemented |
| Pattern matching | ✓ | ✓ | Basic |
| LSP integration | ✓ | ✗ | Not needed |
| Local models | ✓ | ✗ | Cloud-based |

## Usage Examples

### Example 1: Edit Existing Component

**Request:**
```json
{
  "prompt": "Add a loading prop and show spinner when loading",
  "context": {
    "currentFile": {
      "path": "src/Button.tsx",
      "content": "export const Button = ({ children }) => <button>{children}</button>",
      "language": "typescriptreact"
    },
    "relatedFiles": [...],
    "projectStructure": { framework: "react", language: "typescript" }
  },
  "mode": "edit"
}
```

**Response:**
```diff
- export const Button = ({ children }) => {
+ export const Button = ({ children, loading = false }) => {
    return (
-     <button>{children}</button>
+     <button disabled={loading}>
+       {loading ? <Spinner /> : children}
+     </button>
    );
  };
```

### Example 2: Smart Completion

**Request:**
```json
{
  "prompt": "const handleClick = ",
  "position": { line: 5, character: 20 },
  "mode": "complete"
}
```

**Response:**
```typescript
const handleClick = useCallback(() => {
  // Implementation
}, []);
```

### Example 3: Generate New Feature

**Request:**
```json
{
  "prompt": "Create a SearchBar component with debounced input",
  "context": { ... },
  "mode": "generate"
}
```

**Response:**
```typescript
// Complete implementation with:
// - TypeScript types
// - Debouncing
// - Accessibility
// - Styling
// - Tests
```

## Best Practices

### 1. Always Provide Context
- Send project structure
- Include related files
- Share recent changes

### 2. Use Appropriate Modes
- Edit for modifications
- Generate for new code
- Complete for suggestions
- Explain for understanding

### 3. Stream for UX
- Show progress immediately
- Update in real-time
- Provide feedback

### 4. Cache Aggressively
- Cache file analysis
- Cache project structure
- Invalidate on changes

### 5. Limit Context Size
- Top 5 related files
- Truncate long files
- Focus on relevance

## Future Enhancements

1. **LSP Integration**: Real-time type information
2. **Local Models**: Support for local LLMs
3. **Multi-file Refactoring**: Coordinated changes across files
4. **Test Generation**: Automatic test creation
5. **Documentation Generation**: Auto-generated docs
6. **Code Review**: Automated code review suggestions
7. **Performance Analysis**: Performance optimization suggestions
8. **Security Scanning**: Security vulnerability detection

## Conclusion

This agent implements Cursor-like capabilities through:
- Full project context awareness
- Intelligent prompt engineering
- Incremental diff-based updates
- Real-time streaming responses
- Multi-mode operation
- Framework-aware generation

The result is an AI coding assistant that understands your codebase and generates contextually appropriate code.
