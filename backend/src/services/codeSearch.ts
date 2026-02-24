import type { FileContext } from '../types/agent.js';
import type { Symbol } from './astAnalyzer.js';

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
  score: number;
}

export interface SemanticSearchResult {
  file: string;
  symbol: Symbol;
  relevance: number;
  description: string;
}

export class CodeSearch {
  async searchText(
    files: FileContext[],
    query: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      regex?: boolean;
      filePattern?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    let searchRegex: RegExp;
    if (options.regex) {
      searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
      searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
    }

    const fileFilter = options.filePattern
      ? new RegExp(options.filePattern.replace(/\*/g, '.*'))
      : null;

    for (const file of files) {
      if (fileFilter && !fileFilter.test(file.path)) continue;

      const lines = file.content.split('\n');

      lines.forEach((line, lineIndex) => {
        let match;
        searchRegex.lastIndex = 0;

        while ((match = searchRegex.exec(line)) !== null) {
          const contextStart = Math.max(0, lineIndex - 2);
          const contextEnd = Math.min(lines.length, lineIndex + 3);
          const contextLines = lines.slice(contextStart, contextEnd);

          results.push({
            file: file.path,
            line: lineIndex + 1,
            column: match.index,
            match: match[0],
            context: contextLines.join('\n'),
            score: this.calculateScore(query, match[0], line),
          });
        }
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async searchSymbol(
    files: FileContext[],
    symbolName: string,
    symbolType?: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    const symbolRegex = new RegExp(`\\b${symbolName}\\b`, 'g');

    for (const file of files) {
      const lines = file.content.split('\n');

      lines.forEach((line, lineIndex) => {
        let match;
        symbolRegex.lastIndex = 0;

        while ((match = symbolRegex.exec(line)) !== null) {
          const isDefinition = this.isDefinition(line, symbolType);

          if (isDefinition || !symbolType) {
            results.push({
              file: file.path,
              line: lineIndex + 1,
              column: match.index,
              match: match[0],
              context: this.getLineContext(lines, lineIndex),
              score: isDefinition ? 100 : 50,
            });
          }
        }
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async semanticSearch(
    files: FileContext[],
    query: string,
    structures: Map<string, any>
  ): Promise<SemanticSearchResult[]> {
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: SemanticSearchResult[] = [];

    for (const file of files) {
      const structure = structures.get(file.path);
      if (!structure?.symbols) continue;

      for (const symbol of structure.symbols) {
        const symbolText = `${symbol.name} ${symbol.type}`.toLowerCase();
        const relevance = this.calculateSemanticRelevance(queryWords, symbolText);

        if (relevance > 0.3) {
          results.push({
            file: file.path,
            symbol,
            relevance,
            description: this.generateSymbolDescription(symbol),
          });
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async findReferences(
    files: FileContext[],
    symbolName: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const symbolRegex = new RegExp(`\\b${symbolName}\\b`, 'g');

    for (const file of files) {
      const lines = file.content.split('\n');

      lines.forEach((lineIndex, line) => {
        let match;
        symbolRegex.lastIndex = 0;

        while ((match = symbolRegex.exec(lines[lineIndex])) !== null) {
          const isUsage = !this.isDefinition(lines[lineIndex]);

          if (isUsage) {
            results.push({
              file: file.path,
              line: lineIndex + 1,
              column: match.index,
              match: match[0],
              context: this.getLineContext(lines, lineIndex),
              score: 75,
            });
          }
        }
      });
    }

    return results;
  }

  async findUsages(
    files: FileContext[],
    filePath: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const importPath = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    const fileName = filePath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';

    for (const file of files) {
      if (file.path === filePath) continue;

      const lines = file.content.split('\n');

      lines.forEach((line, lineIndex) => {
        if (line.includes('import') && (line.includes(importPath) || line.includes(fileName))) {
          results.push({
            file: file.path,
            line: lineIndex + 1,
            column: 0,
            match: line.trim(),
            context: this.getLineContext(lines, lineIndex),
            score: 90,
          });
        }
      });
    }

    return results;
  }

  async searchInFiles(
    files: FileContext[],
    patterns: string[]
  ): Promise<Map<string, SearchResult[]>> {
    const resultMap = new Map<string, SearchResult[]>();

    for (const pattern of patterns) {
      const results = await this.searchText(files, pattern);
      resultMap.set(pattern, results);
    }

    return resultMap;
  }

  async findTODOs(files: FileContext[]): Promise<SearchResult[]> {
    return this.searchText(files, 'TODO|FIXME|HACK|XXX', { regex: true });
  }

  async findUnusedCode(
    files: FileContext[],
    structures: Map<string, any>
  ): Promise<{ file: string; symbol: string; type: string }[]> {
    const unused: { file: string; symbol: string; type: string }[] = [];
    const allSymbols = new Map<string, Set<string>>();

    for (const [filePath, structure] of structures) {
      if (!structure.symbols) continue;

      for (const symbol of structure.symbols) {
        if (symbol.scope === 'export') {
          if (!allSymbols.has(symbol.name)) {
            allSymbols.set(symbol.name, new Set());
          }
          allSymbols.get(symbol.name)!.add(filePath);
        }
      }
    }

    for (const [symbolName, definedIn] of allSymbols) {
      let usageCount = 0;

      for (const file of files) {
        const usages = file.content.match(new RegExp(`\\b${symbolName}\\b`, 'g'));
        if (usages) {
          usageCount += usages.length;
        }
      }

      if (usageCount <= definedIn.size) {
        for (const filePath of definedIn) {
          unused.push({
            file: filePath,
            symbol: symbolName,
            type: 'unused export',
          });
        }
      }
    }

    return unused;
  }

  private calculateScore(query: string, match: string, line: string): number {
    let score = 50;

    if (match === query) score += 30;

    if (this.isDefinition(line)) score += 20;

    if (/^\s*export/.test(line)) score += 10;

    return score;
  }

  private isDefinition(line: string, type?: string): boolean {
    if (!type) {
      return /^\s*(export\s+)?(const|let|var|function|class|interface|type|enum)\s+/.test(line);
    }

    return new RegExp(`^\\s*(export\\s+)?${type}\\s+`).test(line);
  }

  private getLineContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).join('\n');
  }

  private calculateSemanticRelevance(queryWords: string[], text: string): number {
    const matches = queryWords.filter(word => text.includes(word));
    return matches.length / queryWords.length;
  }

  private generateSymbolDescription(symbol: Symbol): string {
    const scope = symbol.scope === 'export' ? 'exported' : 'local';
    return `${scope} ${symbol.type} at line ${symbol.line}`;
  }

  async fuzzySearch(
    files: FileContext[],
    query: string,
    maxResults: number = 10
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    for (const file of files) {
      const fileName = file.path.split('/').pop() || '';
      const fileScore = this.fuzzyMatch(query, fileName);

      if (fileScore > 0.5) {
        allResults.push({
          file: file.path,
          line: 1,
          column: 0,
          match: fileName,
          context: '',
          score: fileScore * 100,
        });
      }

      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        const lineScore = this.fuzzyMatch(query, line);
        if (lineScore > 0.4) {
          allResults.push({
            file: file.path,
            line: index + 1,
            column: 0,
            match: line.trim(),
            context: this.getLineContext(lines, index),
            score: lineScore * 80,
          });
        }
      });
    }

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  private fuzzyMatch(query: string, text: string): number {
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    if (t.includes(q)) return 1;

    let score = 0;
    let lastIndex = -1;

    for (const char of q) {
      const index = t.indexOf(char, lastIndex + 1);
      if (index === -1) return 0;

      score += 1 / (index - lastIndex);
      lastIndex = index;
    }

    return Math.min(score / q.length, 1);
  }
}
