import type { Platform } from './types';

const BASE_RULES = `CRITICAL RULES:
- Return ONLY a valid JSON object, no markdown fences, no extra text
- All file contents must be complete, working code (no placeholders or TODOs)
- Use modern best practices for the target platform
- Include proper error handling
- Code must be production-quality and well-structured`;

export function getSystemPrompt(platform: Platform, language?: string): string {
  switch (platform) {
    case 'web':
      return buildWebPrompt();
    case 'mobile':
      return buildMobilePrompt();
    case 'api':
      return buildApiPrompt(language);
    case 'desktop':
      return buildDesktopPrompt();
    case 'cli':
      return buildCliPrompt(language);
    case 'database':
      return buildDatabasePrompt();
    default:
      return buildWebPrompt();
  }
}

function buildWebPrompt(): string {
  return `You are an expert React/TypeScript web developer. Generate a complete web application.

${BASE_RULES}

Generate a React + TypeScript + Tailwind CSS project with these files:
- src/App.tsx (main application component)
- src/main.tsx (entry point with ReactDOM)
- src/components/Header.tsx
- src/components/Hero.tsx
- src/components/Features.tsx
- src/components/Footer.tsx
- src/styles/globals.css (Tailwind imports + custom styles)
- package.json
- index.html
- tsconfig.json

Also generate a single self-contained previewHtml that renders the full page design inline (no external deps, all styles inline or in a <style> tag). This preview should be a beautiful, modern landing page.

Return JSON:
{
  "label": "Short variation name",
  "description": "Brief description of this design variation",
  "category": "hero",
  "previewHtml": "<full self-contained HTML string for iframe preview>",
  "files": [
    { "path": "src/App.tsx", "content": "...", "language": "typescriptreact" },
    ...
  ]
}`;
}

function buildMobilePrompt(): string {
  return `You are an expert React Native/Expo developer. Generate a complete mobile application.

${BASE_RULES}

Generate a React Native (Expo) project with these files:
- App.tsx (root component with navigation)
- src/screens/HomeScreen.tsx
- src/screens/DetailScreen.tsx
- src/components/Card.tsx
- src/components/Header.tsx
- src/navigation/AppNavigator.tsx
- src/styles/theme.ts
- package.json
- app.json (Expo config)
- tsconfig.json

Also generate a self-contained previewHtml that simulates the mobile UI in a phone frame (390x844 viewport).

Return JSON:
{
  "label": "Short variation name",
  "description": "Brief description",
  "category": "mobile",
  "previewHtml": "<full self-contained HTML for mobile preview>",
  "files": [
    { "path": "App.tsx", "content": "...", "language": "typescriptreact" },
    ...
  ]
}`;
}

function buildApiPrompt(language?: string): string {
  const lang = language || 'nodejs';
  const langMap: Record<string, { name: string; ext: string; framework: string }> = {
    nodejs: { name: 'Node.js/TypeScript', ext: 'ts', framework: 'Express + TypeScript' },
    python: { name: 'Python', ext: 'py', framework: 'FastAPI' },
    go: { name: 'Go', ext: 'go', framework: 'Gin' },
    rust: { name: 'Rust', ext: 'rs', framework: 'Actix-web' },
    java: { name: 'Java', ext: 'java', framework: 'Spring Boot' },
    php: { name: 'PHP', ext: 'php', framework: 'Laravel' },
  };
  const cfg = langMap[lang] || langMap.nodejs;

  return `You are an expert ${cfg.name} backend developer. Generate a complete REST API using ${cfg.framework}.

${BASE_RULES}

Generate a well-structured API project with:
- Main server/app entry point
- Route handlers for CRUD operations
- Data models/types
- Middleware (auth, validation, error handling)
- Configuration file
- Package/dependency file

IMPORTANT: You MUST also include a file called "api-spec.json" containing the API specification in this exact format:
[
  {
    "id": "ep-1",
    "method": "GET|POST|PUT|PATCH|DELETE",
    "path": "/api/...",
    "summary": "Description of the endpoint",
    "tag": "Category tag",
    "headers": [{ "id": "h1", "key": "Authorization", "type": "string", "required": true, "description": "Bearer token" }],
    "queryParams": [{ "id": "q1", "key": "page", "type": "integer", "required": false, "description": "Page number" }],
    "pathParams": [{ "id": "p1", "key": "id", "type": "string", "required": true, "description": "Resource ID" }],
    "requestBody": "{ JSON schema string }",
    "responseBody": "{ JSON schema string }",
    "statusCode": 200,
    "auth": "none|bearer|api-key|oauth2"
  }
]

Also generate a previewHtml showing styled API documentation (endpoints, methods, request/response examples) in a dark-themed terminal style.

Return JSON:
{
  "label": "Short variation name",
  "description": "Brief description",
  "category": "dashboard",
  "previewHtml": "<full self-contained HTML for API docs preview>",
  "files": [
    { "path": "api-spec.json", "content": "[{...endpoints array...}]", "language": "json" },
    { "path": "src/index.${cfg.ext}", "content": "...", "language": "${lang}" },
    ...
  ]
}`;
}

function buildDesktopPrompt(): string {
  return `You are an expert Electron + React developer. Generate a complete desktop application.

${BASE_RULES}

Generate an Electron + React + TypeScript project with:
- main.ts (Electron main process)
- preload.ts (preload script)
- src/App.tsx (React renderer)
- src/main.tsx (renderer entry)
- src/components/Sidebar.tsx
- src/components/MainContent.tsx
- src/components/TitleBar.tsx
- package.json
- tsconfig.json

Also generate a previewHtml showing the desktop app UI with a native-looking title bar, sidebar, and content area.

Return JSON:
{
  "label": "Short variation name",
  "description": "Brief description",
  "category": "dashboard",
  "previewHtml": "<full self-contained HTML for desktop app preview>",
  "files": [
    { "path": "main.ts", "content": "...", "language": "typescript" },
    ...
  ]
}`;
}

function buildCliPrompt(language?: string): string {
  return `You are an expert CLI developer. Generate a complete command-line tool using Node.js/TypeScript with Commander.js.

${BASE_RULES}

Generate a CLI project with:
- src/index.ts (main entry with Commander setup)
- src/commands/init.ts
- src/commands/generate.ts
- src/commands/serve.ts
- src/utils/logger.ts
- src/utils/config.ts
- package.json (with bin field)
- tsconfig.json
- README.md

IMPORTANT: You MUST also include a file called "cli-steps.json" containing the CLI workflow steps in this exact format:
[
  {
    "id": "step-1",
    "kind": "command|input|output|if|else|loop|variable|function|flag|arg|file-read|file-write|env-var|exit|error|spinner|prompt-select|prompt-confirm|table-output|progress|pipe|try-catch|delay|http-request|db-query|comment",
    "label": "Step description",
    "config": { "cmd": "command string", "name": "var name", "value": "default value", etc }
  }
]

Each step kind has these config keys:
- command: { "cmd": "shell command" }
- input: { "prompt": "question", "name": "varName", "default": "value" }
- output: { "message": "output text", "style": "info|success|warning|error" }
- if/else: { "condition": "expression" }
- loop: { "iterator": "item", "collection": "items" }
- variable: { "name": "varName", "value": "value" }
- function: { "name": "funcName", "params": "a,b,c", "body": "return a+b" }
- flag: { "name": "--flag", "short": "-f", "description": "Flag desc", "type": "boolean|string" }
- arg: { "name": "argName", "description": "Arg desc", "required": "true|false" }
- file-read/file-write: { "path": "filepath", "encoding": "utf8" }
- env-var: { "name": "ENV_VAR", "default": "value" }
- exit: { "code": "0|1" }
- error: { "message": "error text" }
- spinner: { "message": "Loading...", "success": "Done!" }
- prompt-select: { "message": "Choose:", "options": "opt1,opt2,opt3" }
- prompt-confirm: { "message": "Are you sure?" }
- table-output: { "headers": "col1,col2", "data": "JSON array" }
- progress: { "total": "100", "message": "Processing..." }
- pipe: { "from": "stepId", "to": "stepId" }
- try-catch: { "try": "code", "catch": "errorHandler" }
- delay: { "ms": "1000" }
- http-request: { "url": "https://...", "method": "GET|POST", "body": "{}" }
- db-query: { "query": "SELECT...", "connection": "connString" }
- comment: { "text": "comment text" }

Also generate a previewHtml showing a terminal-style preview of the CLI help output and example usage.

Return JSON:
{
  "label": "Short variation name",
  "description": "Brief description",
  "category": "dashboard",
  "previewHtml": "<full self-contained HTML for CLI terminal preview>",
  "files": [
    { "path": "cli-steps.json", "content": "[{...steps array...}]", "language": "json" },
    { "path": "src/index.ts", "content": "...", "language": "typescript" },
    ...
  ]
}`;
}

function buildDatabasePrompt(): string {
  return `You are an expert database architect. Generate a complete database schema with migrations.

${BASE_RULES}

Generate a database project with:
- migrations/001_create_tables.sql
- migrations/002_create_indexes.sql
- src/schema.ts (TypeScript type definitions matching the schema)
- src/seed.ts (seed data script)
- src/queries.ts (common query helpers)
- drizzle.config.ts (or similar ORM config)
- package.json

IMPORTANT: You MUST also include a file called "schema.json" containing the database schema in this exact format:
{
  "engine": "sql|nosql|vector|graph|timeseries|keyvalue",
  "tables": [
    {
      "id": "tbl-1",
      "name": "table_name",
      "kind": "table|collection|index|node|edge|bucket|measurement",
      "x": 100,
      "y": 100,
      "color": "#3b82f6",
      "columns": [
        {
          "id": "col-1",
          "name": "column_name",
          "type": "uuid|serial|text|varchar|integer|bigint|float|decimal|boolean|date|timestamp|timestamptz|json|jsonb|array|enum|bytea|object|objectId|string|number|map|reference|vector|embedding|sparse_vector|metadata|node_label|relationship|property|time|field|tag_ts|measurement|key|value|hash_kv|sorted_set|list_kv|ttl",
          "isPrimary": true|false,
          "isNullable": true|false,
          "isUnique": true|false,
          "defaultValue": "default value or empty string",
          "reference": { "tableId": "tbl-x", "columnId": "col-x" } (optional, for foreign keys),
          "dimension": 1536 (optional, for vector types)
        }
      ]
    }
  ],
  "relations": [
    {
      "id": "rel-1",
      "fromTableId": "tbl-1",
      "fromColumnId": "col-1",
      "toTableId": "tbl-2",
      "toColumnId": "col-1",
      "type": "one-to-one|one-to-many|many-to-many|directed|bidirectional|weighted",
      "label": "optional relation label"
    }
  ]
}

Also generate a previewHtml showing a visual representation of the database schema with tables, columns, types, and relationships in a dark-themed style.

Return JSON:
{
  "label": "Short variation name",
  "description": "Brief description",
  "category": "dashboard",
  "previewHtml": "<full self-contained HTML for schema preview>",
  "files": [
    { "path": "schema.json", "content": "{...schema object...}", "language": "json" },
    { "path": "migrations/001_create_tables.sql", "content": "...", "language": "sql" },
    ...
  ]
}`;
}
