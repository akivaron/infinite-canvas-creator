import { Router, Request, Response } from 'express';
import { ASTAnalyzer } from '../services/astAnalyzer.js';
import { SymbolResolver } from '../services/symbolResolver.js';
import { ChangeDetector } from '../services/changeDetector.js';
import { RefactoringEngine } from '../services/refactoringEngine.js';
import { CodeSearch } from '../services/codeSearch.js';
import { ConversationMemory } from '../services/conversationMemory.js';
import { TerminalExecutor } from '../services/terminalExecutor.js';

const router = Router();

const astAnalyzer = new ASTAnalyzer();
const symbolResolver = new SymbolResolver();
const changeDetector = new ChangeDetector();
const refactoringEngine = new RefactoringEngine();
const codeSearch = new CodeSearch();
const conversationMemory = new ConversationMemory();
const terminalExecutor = new TerminalExecutor();

router.post('/analyze-ast', async (req: Request, res: Response) => {
  try {
    const { filePath, content, language } = req.body;

    let structure;
    if (language === 'typescript' || language === 'typescriptreact') {
      structure = astAnalyzer.analyzeTypeScript(content, filePath);
    } else {
      structure = astAnalyzer.analyzeJavaScript(content, filePath);
    }

    symbolResolver.indexFile(filePath, structure);

    res.json({ structure });
  } catch (error) {
    console.error('AST analysis error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/find-definition', async (req: Request, res: Response) => {
  try {
    const { symbolName, currentFile } = req.body;

    const definition = symbolResolver.findDefinition(symbolName, currentFile);

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    res.json({ definition });
  } catch (error) {
    console.error('Find definition error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/find-references', async (req: Request, res: Response) => {
  try {
    const { symbolName } = req.body;

    const references = symbolResolver.findReferences(symbolName);

    res.json({ references });
  } catch (error) {
    console.error('Find references error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/detect-changes', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    const changes = changeDetector.detectChanges(files);
    const recentChanges = changeDetector.getRecentChanges(10);
    const patterns = changeDetector.detectPatterns();
    const velocity = changeDetector.getChangeVelocity();

    res.json({
      changes,
      recentChanges,
      patterns,
      velocity,
    });
  } catch (error) {
    console.error('Change detection error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/refactor/rename', async (req: Request, res: Response) => {
  try {
    const { files, targetFile, oldName, newName, scope } = req.body;

    const operation = await refactoringEngine.rename(files, targetFile, {
      oldName,
      newName,
      scope: scope || 'file',
    });

    res.json({ operation });
  } catch (error) {
    console.error('Refactoring error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/refactor/extract', async (req: Request, res: Response) => {
  try {
    const { file, name, startLine, endLine, extractTo } = req.body;

    const operation = await refactoringEngine.extractFunction(file, {
      name,
      startLine,
      endLine,
      extractTo: extractTo || 'function',
    });

    res.json({ operation });
  } catch (error) {
    console.error('Extract function error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/refactor/move', async (req: Request, res: Response) => {
  try {
    const { files, sourceFile, symbols, targetFile } = req.body;

    const operation = await refactoringEngine.moveSymbols(files, sourceFile, {
      symbols,
      targetFile,
    });

    res.json({ operation });
  } catch (error) {
    console.error('Move symbols error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/text', async (req: Request, res: Response) => {
  try {
    const { files, query, options } = req.body;

    const results = await codeSearch.searchText(files, query, options);

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/symbol', async (req: Request, res: Response) => {
  try {
    const { files, symbolName, symbolType } = req.body;

    const results = await codeSearch.searchSymbol(files, symbolName, symbolType);

    res.json({ results });
  } catch (error) {
    console.error('Symbol search error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/semantic', async (req: Request, res: Response) => {
  try {
    const { files, query, structures } = req.body;

    const structureMap = new Map(Object.entries(structures));
    const results = await codeSearch.semanticSearch(files, query, structureMap);

    res.json({ results });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/fuzzy', async (req: Request, res: Response) => {
  try {
    const { files, query, maxResults } = req.body;

    const results = await codeSearch.fuzzySearch(files, query, maxResults);

    res.json({ results });
  } catch (error) {
    console.error('Fuzzy search error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/search/todos', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    const results = await codeSearch.findTODOs(files);

    res.json({ results });
  } catch (error) {
    console.error('TODO search error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/conversation/create', async (req: Request, res: Response) => {
  try {
    const { sessionId, projectId } = req.body;

    const context = conversationMemory.createSession(sessionId, projectId);

    res.json({ context });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/conversation/add-turn', async (req: Request, res: Response) => {
  try {
    const { sessionId, request, response } = req.body;

    const turn = conversationMemory.addTurn(sessionId, request, response);

    res.json({ turn });
  } catch (error) {
    console.error('Add turn error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/conversation/feedback', async (req: Request, res: Response) => {
  try {
    const { sessionId, turnId, feedback } = req.body;

    conversationMemory.addFeedback(sessionId, turnId, feedback);

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/conversation/:sessionId/context', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const prompt = conversationMemory.buildContextualPrompt(sessionId);
    const stats = conversationMemory.getStatistics(sessionId);

    res.json({ prompt, stats });
  } catch (error) {
    console.error('Get context error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/terminal/execute', async (req: Request, res: Response) => {
  try {
    const { command, options } = req.body;

    const result = await terminalExecutor.execute(command, options);

    res.json({ result });
  } catch (error) {
    console.error('Terminal execution error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/terminal/install', async (req: Request, res: Response) => {
  try {
    const { packageName, dev, manager } = req.body;

    const result = await terminalExecutor.installDependency(packageName, { dev, manager });

    res.json({ result });
  } catch (error) {
    console.error('Install error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/terminal/run-script', async (req: Request, res: Response) => {
  try {
    const { scriptName, manager } = req.body;

    const result = await terminalExecutor.runScript(scriptName, { manager });

    res.json({ result });
  } catch (error) {
    console.error('Run script error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/terminal/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const history = terminalExecutor.getHistory(limit);

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/terminal/scripts', async (req: Request, res: Response) => {
  try {
    const scripts = await terminalExecutor.getAvailableScripts();
    const manager = await terminalExecutor.detectPackageManager();

    res.json({ scripts, manager });
  } catch (error) {
    console.error('Get scripts error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
