import type { GeneratedFile } from './types';

export function getStaticWebFiles(title: string, previewHtml: string): GeneratedFile[] {
  const safeName = title.toLowerCase().replace(/\s+/g, '-');
  const componentName = title.replace(/[^a-zA-Z0-9]/g, '');

  return [
    {
      path: 'src/App.tsx',
      content: `import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/components/Header.tsx',
      content: `import React from 'react';

export const Header = () => (
  <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
        {/* icon */}
      </div>
      <span className="text-sm font-black uppercase tracking-widest">${title}</span>
    </div>
    <div className="flex items-center gap-6">
      <a href="#features" className="text-xs font-bold uppercase text-gray-500 hover:text-gray-900 transition-colors">Features</a>
      <a href="#pricing" className="text-xs font-bold uppercase text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
      <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors">
        Get Started
      </button>
    </div>
  </nav>
);
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/components/Hero.tsx',
      content: `import React from 'react';

export const Hero = () => (
  <section className="text-center py-24 px-8">
    <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4">Welcome to</p>
    <h1 className="text-5xl font-black uppercase tracking-tight mb-4">${title}</h1>
    <p className="text-gray-500 max-w-lg mx-auto mb-8">
      A beautifully crafted solution built with modern design principles and cutting-edge technology.
    </p>
    <div className="flex items-center justify-center gap-3">
      <button className="px-8 py-3.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors">
        Get Started
      </button>
      <button className="px-8 py-3.5 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wide hover:border-gray-400 transition-colors">
        Learn More
      </button>
    </div>
  </section>
);
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/components/Features.tsx',
      content: `import React from 'react';

const features = [
  { icon: '⚡', title: 'Performance', desc: 'Built for speed at every layer of the stack.' },
  { icon: '🔒', title: 'Security', desc: 'Enterprise-grade security out of the box.' },
  { icon: '📱', title: 'Responsive', desc: 'Beautiful on every device and screen size.' },
];

export const Features = () => (
  <section id="features" className="py-20 px-8">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-black uppercase text-center mb-12">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-sm font-bold uppercase mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/components/Footer.tsx',
      content: `import React from 'react';

export const Footer = () => (
  <footer className="py-12 px-8 border-t border-gray-100 text-center">
    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
      &copy; ${new Date().getFullYear()} ${title}. All rights reserved.
    </p>
  </footer>
);
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/styles/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #2563eb;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
`,
      language: 'css',
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`,
      language: 'html',
    },
    {
      path: 'package.json',
      content: JSON.stringify({
        name: safeName,
        version: '1.0.0',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
        devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^5.0.0', tailwindcss: '^3.4.0', typescript: '^5.0.0' },
      }, null, 2),
      language: 'json',
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: { target: 'ES2020', jsx: 'react-jsx', module: 'ESNext', moduleResolution: 'bundler', strict: true, esModuleInterop: true },
        include: ['src'],
      }, null, 2),
      language: 'json',
    },
  ];
}

export function getStaticMobileFiles(title: string): GeneratedFile[] {
  return [
    {
      path: 'App.tsx',
      content: `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/screens/HomeScreen.tsx',
      content: `import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export const HomeScreen = () => (
  <ScrollView style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>${title}</Text>
      <Text style={styles.subtitle}>Welcome back</Text>
    </View>
    <TouchableOpacity style={styles.card}>
      <Text style={styles.cardTitle}>Get Started</Text>
      <Text style={styles.cardDesc}>Tap to explore features</Text>
    </TouchableOpacity>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: { margin: 16, padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
});
`,
      language: 'typescriptreact',
    },
    {
      path: 'src/navigation/AppNavigator.tsx',
      content: `import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
  </Stack.Navigator>
);
`,
      language: 'typescriptreact',
    },
    {
      path: 'package.json',
      content: JSON.stringify({
        name: title.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        main: 'App.tsx',
        dependencies: {
          'expo': '^50.0.0',
          'react': '^18.3.0',
          'react-native': '^0.73.0',
          '@react-navigation/native': '^6.0.0',
          '@react-navigation/native-stack': '^6.0.0',
        },
      }, null, 2),
      language: 'json',
    },
    {
      path: 'app.json',
      content: JSON.stringify({
        expo: { name: title, slug: title.toLowerCase().replace(/\s+/g, '-'), version: '1.0.0', platforms: ['ios', 'android'] },
      }, null, 2),
      language: 'json',
    },
  ];
}

export function getStaticApiFiles(title: string, language?: string): GeneratedFile[] {
  const lang = language || 'nodejs';
  if (lang === 'python') {
    return [
      { path: 'main.py', content: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="${title} API")

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: str = ""

items: list[Item] = []

@app.get("/api/items")
async def get_items():
    return {"items": items}

@app.post("/api/items")
async def create_item(item: Item):
    item.id = len(items) + 1
    items.append(item)
    return item

@app.get("/api/items/{item_id}")
async def get_item(item_id: int):
    for item in items:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
`, language: 'python' },
      { path: 'requirements.txt', content: 'fastapi==0.109.0\nuvicorn==0.27.0\npydantic==2.5.0\n', language: 'text' },
    ];
  }
  return [
    { path: 'src/index.ts', content: `import express from 'express';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(\`${title} API running on port \${PORT}\`);
});
`, language: 'typescript' },
    { path: 'src/routes/index.ts', content: `import { Router } from 'express';
import { getItems, createItem, getItemById, updateItem, deleteItem } from '../controllers/items';

export const router = Router();

router.get('/items', getItems);
router.post('/items', createItem);
router.get('/items/:id', getItemById);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
`, language: 'typescript' },
    { path: 'src/controllers/items.ts', content: `import { Request, Response, NextFunction } from 'express';

interface Item { id: number; name: string; description: string; }
let items: Item[] = [];
let nextId = 1;

export const getItems = (_req: Request, res: Response) => {
  res.json({ items });
};

export const createItem = (req: Request, res: Response) => {
  const item: Item = { id: nextId++, name: req.body.name, description: req.body.description || '' };
  items.push(item);
  res.status(201).json(item);
};

export const getItemById = (req: Request, res: Response, next: NextFunction) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
};

export const updateItem = (req: Request, res: Response) => {
  const idx = items.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  res.json(items[idx]);
};

export const deleteItem = (req: Request, res: Response) => {
  items = items.filter(i => i.id !== Number(req.params.id));
  res.status(204).send();
};
`, language: 'typescript' },
    { path: 'src/middleware/errorHandler.ts', content: `import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
};
`, language: 'typescript' },
    { path: 'package.json', content: JSON.stringify({
      name: title.toLowerCase().replace(/\s+/g, '-') + '-api',
      version: '1.0.0',
      scripts: { dev: 'tsx watch src/index.ts', build: 'tsc', start: 'node dist/index.js' },
      dependencies: { express: '^4.18.0' },
      devDependencies: { '@types/express': '^4.17.0', typescript: '^5.0.0', tsx: '^4.0.0' },
    }, null, 2), language: 'json' },
    { path: 'tsconfig.json', content: JSON.stringify({
      compilerOptions: { target: 'ES2020', module: 'commonjs', outDir: './dist', strict: true, esModuleInterop: true },
      include: ['src'],
    }, null, 2), language: 'json' },
  ];
}

export function getStaticDesktopFiles(title: string): GeneratedFile[] {
  return [
    { path: 'main.ts', content: `import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`, language: 'typescript' },
    { path: 'preload.ts', content: `import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
});
`, language: 'typescript' },
    { path: 'src/App.tsx', content: `import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { TitleBar } from './components/TitleBar';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TitleBar title="${title}" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <MainContent view={activeView} />
      </div>
    </div>
  );
}
`, language: 'typescriptreact' },
    { path: 'src/components/TitleBar.tsx', content: `import React from 'react';

export const TitleBar = ({ title }: { title: string }) => (
  <div className="h-10 bg-gray-900 text-white flex items-center px-4 text-xs font-bold uppercase tracking-widest select-none" style={{ WebkitAppRegion: 'drag' } as any}>
    {title}
  </div>
);
`, language: 'typescriptreact' },
    { path: 'src/components/Sidebar.tsx', content: `import React from 'react';

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface Props { activeView: string; onNavigate: (id: string) => void; }

export const Sidebar = ({ activeView, onNavigate }: Props) => (
  <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col p-3 gap-1">
    {items.map(item => (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeView === item.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-800'}\`}
      >
        <span>{item.icon}</span> {item.label}
      </button>
    ))}
  </aside>
);
`, language: 'typescriptreact' },
    { path: 'src/components/MainContent.tsx', content: `import React from 'react';

export const MainContent = ({ view }: { view: string }) => (
  <main className="flex-1 p-8 overflow-auto">
    <h1 className="text-2xl font-bold capitalize mb-4">{view}</h1>
    <p className="text-gray-500">Content for {view} goes here.</p>
  </main>
);
`, language: 'typescriptreact' },
    { path: 'package.json', content: JSON.stringify({
      name: title.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      main: 'main.ts',
      scripts: { dev: 'electron .', build: 'electron-builder' },
      dependencies: { electron: '^28.0.0', react: '^18.3.0', 'react-dom': '^18.3.0' },
    }, null, 2), language: 'json' },
  ];
}

export function getStaticCliFiles(title: string): GeneratedFile[] {
  const binName = title.toLowerCase().replace(/\s+/g, '-');
  return [
    { path: 'src/index.ts', content: `#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { serveCommand } from './commands/serve';
import { logger } from './utils/logger';

const program = new Command();

program
  .name('${binName}')
  .description('${title} - CLI tool')
  .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(generateCommand);
program.addCommand(serveCommand);

program.parse();
`, language: 'typescript' },
    { path: 'src/commands/init.ts', content: `import { Command } from 'commander';
import { logger } from '../utils/logger';

export const initCommand = new Command('init')
  .description('Initialize a new project')
  .option('-n, --name <name>', 'Project name')
  .action((opts) => {
    const name = opts.name || 'my-project';
    logger.info(\`Initializing project: \${name}\`);
    logger.success('Project initialized successfully!');
  });
`, language: 'typescript' },
    { path: 'src/commands/generate.ts', content: `import { Command } from 'commander';
import { logger } from '../utils/logger';

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate a new component')
  .argument('<type>', 'Component type (page, component, api)')
  .argument('<name>', 'Component name')
  .action((type, name) => {
    logger.info(\`Generating \${type}: \${name}\`);
    logger.success(\`\${type} "\${name}" generated successfully!\`);
  });
`, language: 'typescript' },
    { path: 'src/commands/serve.ts', content: `import { Command } from 'commander';
import { logger } from '../utils/logger';

export const serveCommand = new Command('serve')
  .description('Start the development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((opts) => {
    logger.info(\`Starting dev server on port \${opts.port}...\`);
    logger.success(\`Server running at http://localhost:\${opts.port}\`);
  });
`, language: 'typescript' },
    { path: 'src/utils/logger.ts', content: `const RESET = '\\x1b[0m';
const GREEN = '\\x1b[32m';
const YELLOW = '\\x1b[33m';
const RED = '\\x1b[31m';
const CYAN = '\\x1b[36m';

export const logger = {
  info: (msg: string) => console.log(\`\${CYAN}[INFO]\${RESET} \${msg}\`),
  success: (msg: string) => console.log(\`\${GREEN}[OK]\${RESET} \${msg}\`),
  warn: (msg: string) => console.log(\`\${YELLOW}[WARN]\${RESET} \${msg}\`),
  error: (msg: string) => console.error(\`\${RED}[ERR]\${RESET} \${msg}\`),
};
`, language: 'typescript' },
    { path: 'src/utils/config.ts', content: `import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = '.${binName}rc.json';

export function loadConfig(): Record<string, any> {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export function saveConfig(config: Record<string, any>): void {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
`, language: 'typescript' },
    { path: 'package.json', content: JSON.stringify({
      name: binName,
      version: '1.0.0',
      bin: { [binName]: 'dist/index.js' },
      scripts: { dev: 'tsx src/index.ts', build: 'tsc' },
      dependencies: { commander: '^12.0.0' },
      devDependencies: { typescript: '^5.0.0', tsx: '^4.0.0', '@types/node': '^20.0.0' },
    }, null, 2), language: 'json' },
    { path: 'tsconfig.json', content: JSON.stringify({
      compilerOptions: { target: 'ES2020', module: 'commonjs', outDir: 'dist', strict: true, esModuleInterop: true },
      include: ['src'],
    }, null, 2), language: 'json' },
  ];
}

export function getStaticDatabaseFiles(title: string, schema: any): GeneratedFile[] {
  const tables = schema?.tables || [];
  const createStatements = tables.map((t: any) => {
    const cols = (t.columns || []).map((c: any) => {
      let def = `  ${c.name} ${c.type}`;
      if (c.isPrimary) def += ' PRIMARY KEY';
      if (!c.isNullable) def += ' NOT NULL';
      if (c.isUnique && !c.isPrimary) def += ' UNIQUE';
      if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
      return def;
    }).join(',\n');
    return `CREATE TABLE IF NOT EXISTS ${t.name} (\n${cols}\n);`;
  }).join('\n\n');

  return [
    { path: 'migrations/001_create_tables.sql', content: `-- ${title} Database Schema\n\n${createStatements}\n`, language: 'sql' },
    { path: 'src/schema.ts', content: `// TypeScript types for ${title} schema\n\n${tables.map((t: any) => {
      const fields = (t.columns || []).map((c: any) => `  ${c.name}: ${sqlToTs(c.type)};`).join('\n');
      return `export interface ${capitalize(t.name)} {\n${fields}\n}`;
    }).join('\n\n')}\n`, language: 'typescript' },
    { path: 'src/queries.ts', content: `// Common queries for ${title}\n\n${tables.map((t: any) => `export const ${t.name}Queries = {
  getAll: \`SELECT * FROM ${t.name}\`,
  getById: \`SELECT * FROM ${t.name} WHERE id = $1\`,
  insert: \`INSERT INTO ${t.name} (${(t.columns || []).filter((c: any) => !c.isPrimary || c.defaultValue).map((c: any) => c.name).join(', ')}) VALUES (${(t.columns || []).filter((c: any) => !c.isPrimary || c.defaultValue).map((_: any, i: number) => '$' + (i + 1)).join(', ')}) RETURNING *\`,
  deleteById: \`DELETE FROM ${t.name} WHERE id = $1\`,
};`).join('\n\n')}\n`, language: 'typescript' },
    { path: 'package.json', content: JSON.stringify({
      name: title.toLowerCase().replace(/\s+/g, '-') + '-db',
      version: '1.0.0',
      dependencies: { pg: '^8.11.0' },
      devDependencies: { '@types/pg': '^8.11.0', typescript: '^5.0.0' },
    }, null, 2), language: 'json' },
  ];
}

function sqlToTs(sqlType: string): string {
  const t = sqlType.toLowerCase();
  if (t.includes('int') || t === 'float' || t === 'decimal' || t === 'bigint' || t === 'serial') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t.includes('json')) return 'Record<string, any>';
  if (t.includes('timestamp') || t === 'date') return 'string';
  if (t === 'uuid') return 'string';
  return 'string';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
