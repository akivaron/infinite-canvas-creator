import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Undo2, Redo2, Plus, Trash2, FileCode, FolderOpen, Folder,
  ChevronRight, ChevronDown, Search, Code2, Terminal, Server, Database,
  Globe, Smartphone, MonitorDot, Copy, Download, PanelLeft, FileJson,
  FileText, FileCog, File, FolderPlus, Edit3, Check
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';

/* ── Types ── */
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  icon?: string;
}

interface Props {
  node: CanvasNode;
  onClose: () => void;
}

/* ── Helpers ── */
let _fid = 0;
const uid = () => `f-${++_fid}-${Date.now()}`;

const getFileIcon = (name: string) => {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (name.endsWith('.jsx') || name.endsWith('.js')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-green-400" />;
  if (name.endsWith('.css') || name.endsWith('.scss')) return <FileCog className="w-3.5 h-3.5 text-pink-400" />;
  if (name.endsWith('.html')) return <Globe className="w-3.5 h-3.5 text-orange-400" />;
  if (name.endsWith('.md') || name.endsWith('.txt')) return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
  if (name.endsWith('.sql')) return <Database className="w-3.5 h-3.5 text-cyan-400" />;
  if (name.endsWith('.sh') || name.endsWith('.bash')) return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
  if (name.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-yellow-300" />;
  if (name.endsWith('.go')) return <FileCode className="w-3.5 h-3.5 text-cyan-300" />;
  if (name.endsWith('.rs')) return <FileCode className="w-3.5 h-3.5 text-orange-300" />;
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return <FileCog className="w-3.5 h-3.5 text-purple-400" />;
  if (name.endsWith('.env')) return <FileCog className="w-3.5 h-3.5 text-amber-400" />;
  if (name.endsWith('.graphql') || name.endsWith('.gql')) return <Server className="w-3.5 h-3.5 text-pink-300" />;
  return <File className="w-3.5 h-3.5 text-muted-foreground" />;
};

const getLangFromName = (name: string): string => {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'javascript';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.css') || name.endsWith('.scss')) return 'css';
  if (name.endsWith('.html')) return 'html';
  if (name.endsWith('.sql')) return 'sql';
  if (name.endsWith('.md')) return 'markdown';
  if (name.endsWith('.py')) return 'python';
  if (name.endsWith('.go')) return 'go';
  if (name.endsWith('.rs')) return 'rust';
  if (name.endsWith('.sh') || name.endsWith('.bash')) return 'bash';
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'yaml';
  if (name.endsWith('.graphql') || name.endsWith('.gql')) return 'graphql';
  if (name.endsWith('.env')) return 'env';
  return 'text';
};

/* ── Default file trees per platform ── */
const getDefaultTree = (platform: string, title: string): FileNode[] => {
  const t = title.toLowerCase().replace(/\s+/g, '-');
  switch (platform) {
    case 'web':
      return [
        { id: uid(), name: 'src', type: 'folder', children: [
          { id: uid(), name: 'components', type: 'folder', children: [
            { id: uid(), name: `${t}.tsx`, type: 'file', content: `import React from 'react';\n\nexport const ${title.replace(/\\s+/g, '')} = () => {\n  return (\n    <div className="p-6">\n      <h1 className="text-2xl font-bold">${title}</h1>\n      <p>Your component here</p>\n    </div>\n  );\n};\n`, language: 'typescript' },
            { id: uid(), name: 'Header.tsx', type: 'file', content: `import React from 'react';\n\nexport const Header = () => (\n  <header className="flex items-center justify-between p-4 border-b">\n    <h1 className="font-bold text-lg">${title}</h1>\n    <nav className="flex gap-4">\n      <a href="#">Home</a>\n      <a href="#">About</a>\n    </nav>\n  </header>\n);\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'styles', type: 'folder', children: [
            { id: uid(), name: 'globals.css', type: 'file', content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --primary: #6366f1;\n}\n`, language: 'css' },
          ]},
          { id: uid(), name: 'App.tsx', type: 'file', content: `import React from 'react';\nimport { Header } from './components/Header';\n\nexport default function App() {\n  return (\n    <div>\n      <Header />\n      <main className="p-6">\n        <h2>Welcome</h2>\n      </main>\n    </div>\n  );\n}\n`, language: 'typescript' },
          { id: uid(), name: 'main.tsx', type: 'file', content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './styles/globals.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`, language: 'typescript' },
        ]},
        { id: uid(), name: 'public', type: 'folder', children: [
          { id: uid(), name: 'index.html', type: 'file', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${title}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`, language: 'html' },
        ]},
        { id: uid(), name: 'package.json', type: 'file', content: `{\n  "name": "${t}",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.3.0",\n    "react-dom": "^18.3.0"\n  }\n}\n`, language: 'json' },
        { id: uid(), name: 'tsconfig.json', type: 'file', content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "jsx": "react-jsx",\n    "module": "ESNext",\n    "strict": true\n  }\n}\n`, language: 'json' },
      ];
    case 'mobile':
      return [
        { id: uid(), name: 'src', type: 'folder', children: [
          { id: uid(), name: 'screens', type: 'folder', children: [
            { id: uid(), name: 'HomeScreen.tsx', type: 'file', content: `import React from 'react';\nimport { View, Text, StyleSheet } from 'react-native';\n\nexport const HomeScreen = () => (\n  <View style={styles.container}>\n    <Text style={styles.title}>${title}</Text>\n  </View>\n);\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },\n  title: { fontSize: 24, fontWeight: 'bold' },\n});\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'navigation', type: 'folder', children: [
            { id: uid(), name: 'AppNavigator.tsx', type: 'file', content: `import React from 'react';\nimport { NavigationContainer } from '@react-navigation/native';\nimport { createStackNavigator } from '@react-navigation/stack';\nimport { HomeScreen } from '../screens/HomeScreen';\n\nconst Stack = createStackNavigator();\n\nexport const AppNavigator = () => (\n  <NavigationContainer>\n    <Stack.Navigator>\n      <Stack.Screen name="Home" component={HomeScreen} />\n    </Stack.Navigator>\n  </NavigationContainer>\n);\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'App.tsx', type: 'file', content: `import React from 'react';\nimport { AppNavigator } from './navigation/AppNavigator';\n\nexport default function App() {\n  return <AppNavigator />;\n}\n`, language: 'typescript' },
        ]},
        { id: uid(), name: 'app.json', type: 'file', content: `{\n  "expo": {\n    "name": "${title}",\n    "slug": "${t}",\n    "version": "1.0.0"\n  }\n}\n`, language: 'json' },
        { id: uid(), name: 'package.json', type: 'file', content: `{\n  "name": "${t}",\n  "version": "1.0.0",\n  "dependencies": {\n    "expo": "~49.0.0",\n    "react-native": "0.72.0"\n  }\n}\n`, language: 'json' },
      ];
    case 'api':
      return [
        { id: uid(), name: 'src', type: 'folder', children: [
          { id: uid(), name: 'routes', type: 'folder', children: [
            { id: uid(), name: 'index.ts', type: 'file', content: `import { Router } from 'express';\nimport { usersRouter } from './users';\n\nconst router = Router();\nrouter.use('/users', usersRouter);\n\nexport default router;\n`, language: 'typescript' },
            { id: uid(), name: 'users.ts', type: 'file', content: `import { Router, Request, Response } from 'express';\n\nexport const usersRouter = Router();\n\nusersRouter.get('/', (req: Request, res: Response) => {\n  res.json({ users: [] });\n});\n\nusersRouter.post('/', (req: Request, res: Response) => {\n  const { name, email } = req.body;\n  res.status(201).json({ id: 1, name, email });\n});\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'middleware', type: 'folder', children: [
            { id: uid(), name: 'auth.ts', type: 'file', content: `import { Request, Response, NextFunction } from 'express';\n\nexport const authMiddleware = (req: Request, res: Response, next: NextFunction) => {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) return res.status(401).json({ error: 'Unauthorized' });\n  // Verify token logic\n  next();\n};\n`, language: 'typescript' },
            { id: uid(), name: 'cors.ts', type: 'file', content: `import cors from 'cors';\n\nexport const corsMiddleware = cors({\n  origin: '*',\n  methods: ['GET', 'POST', 'PUT', 'DELETE'],\n});\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'models', type: 'folder', children: [
            { id: uid(), name: 'User.ts', type: 'file', content: `export interface User {\n  id: number;\n  name: string;\n  email: string;\n  createdAt: Date;\n}\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'server.ts', type: 'file', content: `import express from 'express';\nimport routes from './routes';\nimport { corsMiddleware } from './middleware/cors';\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(corsMiddleware);\napp.use(express.json());\napp.use('/api', routes);\n\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});\n`, language: 'typescript' },
        ]},
        { id: uid(), name: '.env', type: 'file', content: `PORT=3000\nDATABASE_URL=postgresql://localhost:5432/${t}\nJWT_SECRET=your-secret-key\n`, language: 'env' },
        { id: uid(), name: 'package.json', type: 'file', content: `{\n  "name": "${t}-api",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "ts-node-dev src/server.ts",\n    "build": "tsc"\n  },\n  "dependencies": {\n    "express": "^4.18.0",\n    "cors": "^2.8.5"\n  }\n}\n`, language: 'json' },
        { id: uid(), name: 'tsconfig.json', type: 'file', content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "commonjs",\n    "outDir": "dist",\n    "strict": true\n  }\n}\n`, language: 'json' },
      ];
    case 'cli':
      return [
        { id: uid(), name: 'src', type: 'folder', children: [
          { id: uid(), name: 'commands', type: 'folder', children: [
            { id: uid(), name: 'init.ts', type: 'file', content: `import { Command } from 'commander';\n\nexport const initCommand = new Command('init')\n  .description('Initialize a new project')\n  .option('-n, --name <name>', 'Project name')\n  .action((opts) => {\n    console.log('Initializing project:', opts.name || '${title}');\n  });\n`, language: 'typescript' },
            { id: uid(), name: 'build.ts', type: 'file', content: `import { Command } from 'commander';\n\nexport const buildCommand = new Command('build')\n  .description('Build the project')\n  .option('-o, --output <dir>', 'Output directory', 'dist')\n  .action((opts) => {\n    console.log('Building to:', opts.output);\n  });\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'utils', type: 'folder', children: [
            { id: uid(), name: 'logger.ts', type: 'file', content: `import chalk from 'chalk';\n\nexport const log = {\n  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),\n  success: (msg: string) => console.log(chalk.green('✓'), msg),\n  error: (msg: string) => console.log(chalk.red('✗'), msg),\n  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),\n};\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'index.ts', type: 'file', content: `#!/usr/bin/env node\nimport { Command } from 'commander';\nimport { initCommand } from './commands/init';\nimport { buildCommand } from './commands/build';\n\nconst program = new Command();\n\nprogram\n  .name('${t}')\n  .description('${title} CLI tool')\n  .version('1.0.0');\n\nprogram.addCommand(initCommand);\nprogram.addCommand(buildCommand);\n\nprogram.parse();\n`, language: 'typescript' },
        ]},
        { id: uid(), name: 'package.json', type: 'file', content: `{\n  "name": "${t}",\n  "version": "1.0.0",\n  "bin": { "${t}": "dist/index.js" },\n  "scripts": {\n    "build": "tsc",\n    "dev": "ts-node src/index.ts"\n  },\n  "dependencies": {\n    "commander": "^11.0.0",\n    "chalk": "^5.3.0"\n  }\n}\n`, language: 'json' },
        { id: uid(), name: 'tsconfig.json', type: 'file', content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "commonjs",\n    "outDir": "dist",\n    "strict": true\n  }\n}\n`, language: 'json' },
      ];
    case 'desktop':
      return [
        { id: uid(), name: 'src', type: 'folder', children: [
          { id: uid(), name: 'main', type: 'folder', children: [
            { id: uid(), name: 'main.ts', type: 'file', content: `import { app, BrowserWindow } from 'electron';\nimport path from 'path';\n\nfunction createWindow() {\n  const win = new BrowserWindow({\n    width: 1200,\n    height: 800,\n    webPreferences: {\n      preload: path.join(__dirname, 'preload.js'),\n    },\n  });\n  win.loadFile('index.html');\n}\n\napp.whenReady().then(createWindow);\n\napp.on('window-all-closed', () => {\n  if (process.platform !== 'darwin') app.quit();\n});\n`, language: 'typescript' },
            { id: uid(), name: 'preload.ts', type: 'file', content: `import { contextBridge, ipcRenderer } from 'electron';\n\ncontextBridge.exposeInMainWorld('api', {\n  send: (channel: string, data: any) => ipcRenderer.send(channel, data),\n  receive: (channel: string, fn: (...args: any[]) => void) =>\n    ipcRenderer.on(channel, (_, ...args) => fn(...args)),\n});\n`, language: 'typescript' },
          ]},
          { id: uid(), name: 'renderer', type: 'folder', children: [
            { id: uid(), name: 'App.tsx', type: 'file', content: `import React from 'react';\n\nexport const App = () => (\n  <div className="p-6">\n    <h1 className="text-2xl font-bold">${title}</h1>\n    <p className="text-gray-600">Desktop Application</p>\n  </div>\n);\n`, language: 'typescript' },
            { id: uid(), name: 'index.tsx', type: 'file', content: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { App } from './App';\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);\n`, language: 'typescript' },
          ]},
        ]},
        { id: uid(), name: 'package.json', type: 'file', content: `{\n  "name": "${t}",\n  "version": "1.0.0",\n  "main": "dist/main/main.js",\n  "scripts": {\n    "dev": "electron .",\n    "build": "tsc && electron-builder"\n  },\n  "dependencies": {\n    "electron": "^28.0.0"\n  }\n}\n`, language: 'json' },
        { id: uid(), name: 'electron-builder.yml', type: 'file', content: `appId: com.${t}.app\nproductName: ${title}\nfiles:\n  - dist/**/*\n  - package.json\nmac:\n  target: dmg\nwin:\n  target: nsis\nlinux:\n  target: AppImage\n`, language: 'yaml' },
      ];
    case 'database':
      return [
        { id: uid(), name: 'migrations', type: 'folder', children: [
          { id: uid(), name: '001_init.sql', type: 'file', content: `-- Migration: Initial Schema\n-- Created: ${new Date().toISOString().split('T')[0]}\n\nCREATE TABLE IF NOT EXISTS users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE TABLE IF NOT EXISTS posts (\n  id SERIAL PRIMARY KEY,\n  title VARCHAR(255) NOT NULL,\n  content TEXT,\n  user_id INTEGER REFERENCES users(id),\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX idx_posts_user_id ON posts(user_id);\n`, language: 'sql' },
        ]},
        { id: uid(), name: 'seeds', type: 'folder', children: [
          { id: uid(), name: 'seed.sql', type: 'file', content: `-- Seed Data\nINSERT INTO users (name, email) VALUES\n  ('Alice', 'alice@example.com'),\n  ('Bob', 'bob@example.com');\n\nINSERT INTO posts (title, content, user_id) VALUES\n  ('Hello World', 'First post content', 1),\n  ('Getting Started', 'Tutorial post', 2);\n`, language: 'sql' },
        ]},
        { id: uid(), name: 'schema', type: 'folder', children: [
          { id: uid(), name: 'tables.sql', type: 'file', content: `-- Full Schema Definition\n-- Database: ${title}\n\n-- Users table\nCREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  password_hash TEXT NOT NULL,\n  role VARCHAR(50) DEFAULT 'user',\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n\n-- RLS Policies\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n`, language: 'sql' },
          { id: uid(), name: 'functions.sql', type: 'file', content: `-- Database Functions\n\nCREATE OR REPLACE FUNCTION update_updated_at()\nRETURNS TRIGGER AS $$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE TRIGGER users_updated_at\n  BEFORE UPDATE ON users\n  FOR EACH ROW\n  EXECUTE FUNCTION update_updated_at();\n`, language: 'sql' },
        ]},
        { id: uid(), name: 'drizzle.config.ts', type: 'file', content: `import type { Config } from 'drizzle-kit';\n\nexport default {\n  schema: './src/db/schema.ts',\n  out: './migrations',\n  driver: 'pg',\n  dbCredentials: {\n    connectionString: process.env.DATABASE_URL!,\n  },\n} satisfies Config;\n`, language: 'typescript' },
        { id: uid(), name: '.env', type: 'file', content: `DATABASE_URL=postgresql://user:password@localhost:5432/${t}\n`, language: 'env' },
      ];
    default:
      return [
        { id: uid(), name: 'src', type: 'folder', children: [
          { id: uid(), name: 'index.ts', type: 'file', content: `// ${title}\nconsole.log('Hello from ${title}');\n`, language: 'typescript' },
        ]},
        { id: uid(), name: 'package.json', type: 'file', content: `{\n  "name": "${t}",\n  "version": "1.0.0"\n}\n`, language: 'json' },
      ];
  }
};

/* ── Syntax highlight (lightweight) ── */
const highlightCode = (code: string, lang: string): string => {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  html = html.replace(/(\/\/.*$)/gm, '<span class="ce-comment">$1</span>');
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="ce-comment">$1</span>');
  html = html.replace(/(--.*$)/gm, '<span class="ce-comment">$1</span>');
  html = html.replace(/(#.*$)/gm, '<span class="ce-comment">$1</span>');

  // Strings
  html = html.replace(/(&#39;[^&#]*?&#39;|`[^`]*?`)/g, '<span class="ce-string">$1</span>');
  html = html.replace(/(&quot;[^&]*?&quot;)/g, '<span class="ce-string">$1</span>');

  // Keywords
  const kwList = ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else',
    'for', 'while', 'class', 'interface', 'type', 'extends', 'implements', 'new', 'async', 'await',
    'try', 'catch', 'throw', 'default', 'switch', 'case', 'break', 'continue',
    'CREATE', 'TABLE', 'INSERT', 'INTO', 'VALUES', 'SELECT', 'FROM', 'WHERE', 'ALTER', 'DROP',
    'INDEX', 'ON', 'PRIMARY', 'KEY', 'REFERENCES', 'NOT', 'NULL', 'DEFAULT', 'UNIQUE',
    'IF', 'EXISTS', 'RETURNS', 'TRIGGER', 'AS', 'BEGIN', 'END', 'LANGUAGE', 'ENABLE', 'ROW', 'LEVEL', 'SECURITY',
    'OR', 'REPLACE', 'FUNCTION', 'BEFORE', 'UPDATE', 'FOR', 'EACH', 'EXECUTE',
  ];
  const kwRegex = new RegExp(`\\b(${kwList.join('|')})\\b`, 'g');
  html = html.replace(kwRegex, '<span class="ce-keyword">$1</span>');

  // Types & built-ins
  const types = ['string', 'number', 'boolean', 'void', 'any', 'null', 'undefined', 'true', 'false',
    'React', 'useState', 'useEffect', 'useCallback', 'useRef', 'Promise',
    'VARCHAR', 'INTEGER', 'SERIAL', 'TEXT', 'TIMESTAMP', 'BOOLEAN',
  ];
  const tyRegex = new RegExp(`\\b(${types.join('|')})\\b`, 'g');
  html = html.replace(tyRegex, '<span class="ce-type">$1</span>');

  return html;
};

/* ── Folder Tree Item ── */
const TreeItem = ({
  node, depth, selectedId, onSelect, onDelete, onRename, onAddFile, onAddFolder,
}: {
  node: FileNode; depth: number; selectedId: string | null;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddFile: (parentId: string) => void; onAddFolder: (parentId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const [renaming, setRenaming] = useState(false);
  const [rName, setRName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (renaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [renaming]);

  const isFolder = node.type === 'folder';
  const isActive = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-lg text-xs transition-all group
          ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => { if (isFolder) setExpanded(!expanded); else onSelect(node.id); }}
        onDoubleClick={() => { setRenaming(true); }}
      >
        {isFolder ? (
          expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        ) : <span className="w-3" />}
        {isFolder ? (expanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />) : getFileIcon(node.name)}

        {renaming ? (
          <input
            ref={inputRef}
            value={rName}
            onChange={e => setRName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(node.id, rName); setRenaming(false); } if (e.key === 'Escape') { setRName(node.name); setRenaming(false); } }}
            onBlur={() => { onRename(node.id, rName); setRenaming(false); }}
            className="flex-1 bg-transparent border-b border-primary/30 outline-none text-xs font-mono px-1"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="truncate font-mono text-[11px]">{node.name}</span>
        )}

        {/* Hover actions */}
        <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFolder && (
            <>
              <button onClick={e => { e.stopPropagation(); onAddFile(node.id); }} className="p-0.5 rounded hover:bg-secondary" title="New file"><Plus className="w-3 h-3" /></button>
              <button onClick={e => { e.stopPropagation(); onAddFolder(node.id); }} className="p-0.5 rounded hover:bg-secondary" title="New folder"><FolderPlus className="w-3 h-3" /></button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(node.id); }} className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive" title="Delete"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Children */}
      {isFolder && expanded && node.children && (
        <div>
          {node.children
            .sort((a, b) => { if (a.type !== b.type) return a.type === 'folder' ? -1 : 1; return a.name.localeCompare(b.name); })
            .map(child => (
              <TreeItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} onAddFile={onAddFile} onAddFolder={onAddFolder} />
            ))}
        </div>
      )}
    </div>
  );
};

/* ── MAIN COMPONENT ── */
export const CodeEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const platform = node.platform || (node.type === 'api' ? 'api' : node.type === 'cli' ? 'cli' : node.type === 'database' ? 'database' : 'web');

  const [tree, setTree] = useState<FileNode[]>(() => getDefaultTree(platform, node.title));
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<{ id: string; name: string }[]>([]);
  const [showTree, setShowTree] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // History for undo/redo
  const [history, setHistory] = useState<FileNode[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const pushHistory = useCallback((t: FileNode[]) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), t]);
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  /* ── Tree helpers ── */
  const findFile = useCallback((nodes: FileNode[], id: string): FileNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) { const f = findFile(n.children, id); if (f) return f; }
    }
    return null;
  }, []);

  const updateFileInTree = useCallback((nodes: FileNode[], id: string, updates: Partial<FileNode>): FileNode[] => {
    return nodes.map(n => {
      if (n.id === id) return { ...n, ...updates };
      if (n.children) return { ...n, children: updateFileInTree(n.children, id, updates) };
      return n;
    });
  }, []);

  const deleteFromTree = useCallback((nodes: FileNode[], id: string): FileNode[] => {
    return nodes.filter(n => n.id !== id).map(n => {
      if (n.children) return { ...n, children: deleteFromTree(n.children, id) };
      return n;
    });
  }, []);

  const addToTree = useCallback((nodes: FileNode[], parentId: string, child: FileNode): FileNode[] => {
    return nodes.map(n => {
      if (n.id === parentId && n.type === 'folder') return { ...n, children: [...(n.children || []), child] };
      if (n.children) return { ...n, children: addToTree(n.children, parentId, child) };
      return n;
    });
  }, []);

  const activeFile = activeFileId ? findFile(tree, activeFileId) : null;

  /* ── Select file ── */
  const handleSelectFile = useCallback((id: string) => {
    setActiveFileId(id);
    const file = findFile(tree, id);
    if (file && !openTabs.find(t => t.id === id)) {
      setOpenTabs(prev => [...prev, { id, name: file.name }]);
    }
  }, [tree, openTabs, findFile]);

  /* ── Close tab ── */
  const closeTab = useCallback((id: string) => {
    setOpenTabs(prev => prev.filter(t => t.id !== id));
    if (activeFileId === id) {
      const remaining = openTabs.filter(t => t.id !== id);
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  }, [activeFileId, openTabs]);

  /* ── Content change ── */
  const handleContentChange = useCallback((content: string) => {
    if (!activeFileId) return;
    const updated = updateFileInTree(tree, activeFileId, { content });
    setTree(updated);
  }, [activeFileId, tree, updateFileInTree]);

  /* ── Delete ── */
  const handleDelete = useCallback((id: string) => {
    const updated = deleteFromTree(tree, id);
    pushHistory(updated);
    setTree(updated);
    if (activeFileId === id) setActiveFileId(null);
    setOpenTabs(prev => prev.filter(t => t.id !== id));
  }, [tree, activeFileId, deleteFromTree, pushHistory]);

  /* ── Rename ── */
  const handleRename = useCallback((id: string, name: string) => {
    if (!name.trim()) return;
    const updated = updateFileInTree(tree, id, { name: name.trim() });
    pushHistory(updated);
    setTree(updated);
    setOpenTabs(prev => prev.map(t => t.id === id ? { ...t, name: name.trim() } : t));
  }, [tree, updateFileInTree, pushHistory]);

  /* ── Add file/folder ── */
  const handleAddFile = useCallback((parentId: string) => {
    const newFile: FileNode = { id: uid(), name: 'untitled.ts', type: 'file', content: '// New file\n', language: 'typescript' };
    const updated = addToTree(tree, parentId, newFile);
    pushHistory(updated);
    setTree(updated);
  }, [tree, addToTree, pushHistory]);

  const handleAddFolder = useCallback((parentId: string) => {
    const newFolder: FileNode = { id: uid(), name: 'new-folder', type: 'folder', children: [] };
    const updated = addToTree(tree, parentId, newFolder);
    pushHistory(updated);
    setTree(updated);
  }, [tree, addToTree, pushHistory]);

  const handleAddRootFile = useCallback(() => {
    const newFile: FileNode = { id: uid(), name: 'untitled.ts', type: 'file', content: '// New file\n', language: 'typescript' };
    const updated = [...tree, newFile];
    pushHistory(updated);
    setTree(updated);
  }, [tree, pushHistory]);

  const handleAddRootFolder = useCallback(() => {
    const newFolder: FileNode = { id: uid(), name: 'new-folder', type: 'folder', children: [] };
    const updated = [...tree, newFolder];
    pushHistory(updated);
    setTree(updated);
  }, [tree, pushHistory]);

  /* ── Undo/Redo ── */
  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < history.length - 1;
  const handleUndo = useCallback(() => { if (canUndo) { setHistoryIdx(i => i - 1); setTree(history[historyIdx - 1]); } }, [canUndo, history, historyIdx]);
  const handleRedo = useCallback(() => { if (canRedo) { setHistoryIdx(i => i + 1); setTree(history[historyIdx + 1]); } }, [canRedo, history, historyIdx]);

  /* ── Save ── */
  const handleSave = useCallback(() => {
    // Collect all file contents as a combined string for the node
    const collectCode = (nodes: FileNode[], prefix = ''): string => {
      let result = '';
      for (const n of nodes) {
        const path = prefix ? `${prefix}/${n.name}` : n.name;
        if (n.type === 'file' && n.content) {
          result += `// === ${path} ===\n${n.content}\n\n`;
        }
        if (n.children) result += collectCode(n.children, path);
      }
      return result;
    };
    const code = collectCode(tree);
    updateNode(node.id, { generatedCode: code });
  }, [tree, node.id, updateNode]);

  /* ── Search files ── */
  const flatFiles = useCallback((nodes: FileNode[], prefix = ''): { id: string; path: string; name: string }[] => {
    const result: { id: string; path: string; name: string }[] = [];
    for (const n of nodes) {
      const path = prefix ? `${prefix}/${n.name}` : n.name;
      if (n.type === 'file') result.push({ id: n.id, path, name: n.name });
      if (n.children) result.push(...flatFiles(n.children, path));
    }
    return result;
  }, []);

  const allFiles = flatFiles(tree);
  const filteredFiles = searchQuery ? allFiles.filter(f => f.path.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') { e.preventDefault(); handleSave(); }
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
        if (e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
        if (e.key === 'p') { e.preventDefault(); setShowSearch(true); }
      }
      if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleUndo, handleRedo, onClose]);

  // Auto-save debounce
  useEffect(() => {
    const t = setTimeout(handleSave, 2000);
    return () => clearTimeout(t);
  }, [tree, handleSave]);

  const platformColors: Record<string, { border: string; text: string; bg: string; icon: typeof Globe }> = {
    web: { border: 'border-primary/30', text: 'text-primary', bg: 'bg-primary/10', icon: Globe },
    mobile: { border: 'border-foreground/30', text: 'text-foreground', bg: 'bg-foreground/10', icon: Smartphone },
    api: { border: 'border-rose-500/30', text: 'text-rose-400', bg: 'bg-rose-500/10', icon: Server },
    cli: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Terminal },
    desktop: { border: 'border-violet-500/30', text: 'text-violet-400', bg: 'bg-violet-500/10', icon: MonitorDot },
    database: { border: 'border-cyan-500/30', text: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: Database },
  };
  const pf = platformColors[platform] || platformColors.web;
  const PlatformIcon = pf.icon;

  const lineCount = activeFile?.content?.split('\n').length || 0;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: 'hsl(var(--background))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${pf.bg} ${pf.border} border`}>
          <PlatformIcon className={`w-4 h-4 ${pf.text}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${pf.text}`}>{platform}</span>
        </div>
        <Code2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground truncate">{node.title}</span>
        <span className="text-[10px] text-muted-foreground font-mono">Code Editor</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Search files (⌘P)"><Search className="w-4 h-4" /></button>
          <button onClick={handleUndo} disabled={!canUndo} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all disabled:opacity-30" title="Undo"><Undo2 className="w-4 h-4" /></button>
          <button onClick={handleRedo} disabled={!canRedo} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all disabled:opacity-30" title="Redo"><Redo2 className="w-4 h-4" /></button>
          <button onClick={handleSave} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="Save (⌘S)"><Save className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Close (Esc)"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ── Search overlay ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-[480px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
              />
            </div>
            {filteredFiles.length > 0 && (
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredFiles.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { handleSelectFile(f.id); setShowSearch(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary text-left transition-all"
                  >
                    {getFileIcon(f.name)}
                    <span className="text-xs font-mono text-foreground truncate">{f.path}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar toggle */}
        <button
          onClick={() => setShowTree(!showTree)}
          className="absolute left-2 bottom-3 z-20 p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all shadow-lg"
          title="Toggle file tree"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* ── File tree ── */}
        <AnimatePresence>
          {showTree && (
            <motion.div
              className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden"
              initial={{ width: 0, opacity: 0 }} animate={{ width: 256, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Explorer</span>
                <div className="flex gap-0.5">
                  <button onClick={handleAddRootFile} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="New file"><Plus className="w-3.5 h-3.5" /></button>
                  <button onClick={handleAddRootFolder} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all" title="New folder"><FolderPlus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {tree
                  .sort((a, b) => { if (a.type !== b.type) return a.type === 'folder' ? -1 : 1; return a.name.localeCompare(b.name); })
                  .map(n => (
                    <TreeItem
                      key={n.id} node={n} depth={0} selectedId={activeFileId}
                      onSelect={handleSelectFile} onDelete={handleDelete}
                      onRename={handleRename} onAddFile={handleAddFile} onAddFolder={handleAddFolder}
                    />
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Editor area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center gap-0 border-b border-border bg-card shrink-0 overflow-x-auto">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-border text-xs font-mono transition-all
                    ${activeFileId === tab.id ? 'bg-background text-foreground border-b-2 border-b-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                  onClick={() => setActiveFileId(tab.id)}
                >
                  {getFileIcon(tab.name)}
                  <span className="truncate max-w-[120px]">{tab.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="p-0.5 rounded hover:bg-secondary hover:text-destructive transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor content */}
          {activeFile ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Line numbers + textarea */}
              <div className="flex-1 flex overflow-auto bg-background" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace" }}>
                {/* Line numbers */}
                <div className="shrink-0 select-none text-right pr-3 pl-4 py-4 text-muted-foreground/40 text-[11px] leading-[20px] border-r border-border/50">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Code area */}
                <div className="flex-1 relative">
                  <pre
                    className="absolute inset-0 p-4 text-[12px] leading-[20px] text-foreground overflow-auto pointer-events-none whitespace-pre"
                    dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content || '', activeFile.language || 'text') }}
                    aria-hidden
                  />
                  <textarea
                    ref={textareaRef}
                    value={activeFile.content || ''}
                    onChange={e => handleContentChange(e.target.value)}
                    spellCheck={false}
                    className="absolute inset-0 p-4 text-[12px] leading-[20px] bg-transparent text-transparent caret-foreground resize-none outline-none w-full h-full font-mono whitespace-pre overflow-auto"
                    style={{ fontFamily: 'inherit', tabSize: 2 }}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const ta = e.currentTarget;
                        const start = ta.selectionStart;
                        const end = ta.selectionEnd;
                        const val = ta.value;
                        handleContentChange(val.substring(0, start) + '  ' + val.substring(end));
                        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center space-y-3">
                <Code2 className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground font-medium">Select a file to start editing</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono">⌘P to search files • ⌘S to save</p>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border bg-card text-[10px] text-muted-foreground font-mono shrink-0">
            <span className={`flex items-center gap-1.5 ${pf.text}`}><PlatformIcon className="w-3 h-3" /> {platform.toUpperCase()}</span>
            {activeFile && <span>{getLangFromName(activeFile.name).toUpperCase()}</span>}
            {activeFile && <span>Ln {lineCount}</span>}
            <span className="ml-auto">UTF-8</span>
            <span>Spaces: 2</span>
          </div>
        </div>
      </div>

      {/* Syntax highlight styles */}
      <style>{`
        .ce-keyword { color: hsl(280 80% 65%); font-weight: 600; }
        .ce-string { color: hsl(140 60% 55%); }
        .ce-comment { color: hsl(var(--muted-foreground) / 0.5); font-style: italic; }
        .ce-type { color: hsl(200 80% 60%); }
      `}</style>
    </motion.div>
  );
};
