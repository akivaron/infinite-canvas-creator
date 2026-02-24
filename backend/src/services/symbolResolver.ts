import type { FileContext } from '../types/agent.js';
import type { Symbol, CodeStructure } from './astAnalyzer.js';

export interface SymbolReference {
  symbol: Symbol;
  filePath: string;
  usages: SymbolUsage[];
}

export interface SymbolUsage {
  filePath: string;
  line: number;
  column: number;
  context: string;
}

export interface DefinitionLocation {
  filePath: string;
  line: number;
  column: number;
  symbol: Symbol;
}

export class SymbolResolver {
  private symbolIndex: Map<string, SymbolReference[]> = new Map();
  private fileStructures: Map<string, CodeStructure> = new Map();

  indexFile(filePath: string, structure: CodeStructure): void {
    this.fileStructures.set(filePath, structure);

    structure.symbols.forEach(symbol => {
      const key = symbol.name;
      const existing = this.symbolIndex.get(key) || [];

      const ref: SymbolReference = {
        symbol,
        filePath,
        usages: [],
      };

      existing.push(ref);
      this.symbolIndex.set(key, existing);
    });
  }

  findDefinition(symbolName: string, currentFile: string): DefinitionLocation | null {
    const refs = this.symbolIndex.get(symbolName);
    if (!refs || refs.length === 0) return null;

    const currentFileRef = refs.find(r => r.filePath === currentFile);
    if (currentFileRef) {
      return {
        filePath: currentFileRef.filePath,
        line: currentFileRef.symbol.line,
        column: currentFileRef.symbol.column,
        symbol: currentFileRef.symbol,
      };
    }

    const exportedRef = refs.find(r => r.symbol.scope === 'export');
    if (exportedRef) {
      return {
        filePath: exportedRef.filePath,
        line: exportedRef.symbol.line,
        column: exportedRef.symbol.column,
        symbol: exportedRef.symbol,
      };
    }

    return {
      filePath: refs[0].filePath,
      line: refs[0].symbol.line,
      column: refs[0].symbol.column,
      symbol: refs[0].symbol,
    };
  }

  findReferences(symbolName: string): SymbolReference[] {
    return this.symbolIndex.get(symbolName) || [];
  }

  findSymbolsInFile(filePath: string): Symbol[] {
    const structure = this.fileStructures.get(filePath);
    return structure?.symbols || [];
  }

  findImportedSymbols(filePath: string): Map<string, string> {
    const structure = this.fileStructures.get(filePath);
    const symbolMap = new Map<string, string>();

    structure?.imports.forEach(imp => {
      imp.imports.forEach(importName => {
        symbolMap.set(importName, imp.source);
      });
    });

    return symbolMap;
  }

  resolveImportPath(importSource: string, currentFile: string): string | null {
    if (importSource.startsWith('.')) {
      const currentDir = currentFile.split('/').slice(0, -1).join('/');
      let resolved = currentDir + '/' + importSource;

      resolved = this.normalizePath(resolved);

      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
      for (const ext of extensions) {
        const candidate = resolved + ext;
        if (this.fileStructures.has(candidate)) {
          return candidate;
        }
      }

      if (this.fileStructures.has(resolved)) {
        return resolved;
      }
    }

    return null;
  }

  private normalizePath(path: string): string {
    const parts = path.split('/');
    const result: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part !== '.' && part !== '') {
        result.push(part);
      }
    }

    return result.join('/');
  }

  getSymbolHierarchy(symbolName: string): SymbolReference[] {
    const refs = this.findReferences(symbolName);
    const hierarchy: SymbolReference[] = [];

    refs.forEach(ref => {
      hierarchy.push(ref);

      if (ref.symbol.type === 'class') {
        const childSymbols = this.findChildSymbols(ref.filePath, ref.symbol.name);
        childSymbols.forEach(child => {
          const childRefs = this.findReferences(child.name);
          hierarchy.push(...childRefs);
        });
      }
    });

    return hierarchy;
  }

  private findChildSymbols(filePath: string, parentName: string): Symbol[] {
    const structure = this.fileStructures.get(filePath);
    if (!structure) return [];

    return structure.symbols.filter(s =>
      s.name.startsWith(parentName + '.') ||
      s.name.startsWith(parentName + '_')
    );
  }

  getFileImportGraph(filePath: string): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();

    const traverse = (file: string, depth: number) => {
      if (visited.has(file) || depth > 3) return;
      visited.add(file);

      const structure = this.fileStructures.get(file);
      if (!structure) return;

      const imports: string[] = [];

      structure.imports.forEach(imp => {
        const resolved = this.resolveImportPath(imp.source, file);
        if (resolved) {
          imports.push(resolved);
          traverse(resolved, depth + 1);
        }
      });

      graph.set(file, imports);
    };

    traverse(filePath, 0);
    return graph;
  }

  findUnusedImports(filePath: string, fileContent: string): string[] {
    const structure = this.fileStructures.get(filePath);
    if (!structure) return [];

    const unused: string[] = [];

    structure.imports.forEach(imp => {
      imp.imports.forEach(importName => {
        const regex = new RegExp(`\\b${importName}\\b`, 'g');
        const matches = fileContent.match(regex) || [];

        if (matches.length <= 1) {
          unused.push(importName);
        }
      });
    });

    return unused;
  }

  suggestImports(symbolName: string, currentFile: string): DefinitionLocation[] {
    const refs = this.findReferences(symbolName);

    return refs
      .filter(ref => ref.symbol.scope === 'export')
      .map(ref => ({
        filePath: ref.filePath,
        line: ref.symbol.line,
        column: ref.symbol.column,
        symbol: ref.symbol,
      }));
  }
}
