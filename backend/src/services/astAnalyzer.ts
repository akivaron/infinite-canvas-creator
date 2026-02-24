import { parse as jsParser } from 'esprima';

export interface Symbol {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'component';
  line: number;
  column: number;
  scope: 'export' | 'local';
  signature?: string;
}

export interface CodeStructure {
  symbols: Symbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  complexity: number;
  linesOfCode: number;
}

export interface ImportInfo {
  source: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ExportInfo {
  name: string;
  type: string;
  isDefault: boolean;
}

export class ASTAnalyzer {
  analyzeJavaScript(content: string, filePath: string): CodeStructure {
    try {
      const ast = jsParser(content, {
        sourceType: 'module',
        jsx: true,
        loc: true,
        tolerant: true,
      });

      const symbols: Symbol[] = [];
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];
      const dependencies = new Set<string>();

      this.traverseAST(ast, symbols, imports, exports, dependencies);

      return {
        symbols,
        imports,
        exports,
        dependencies: Array.from(dependencies),
        complexity: this.calculateComplexity(symbols),
        linesOfCode: content.split('\n').length,
      };
    } catch (error) {
      return {
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        complexity: 0,
        linesOfCode: content.split('\n').length,
      };
    }
  }

  analyzeTypeScript(content: string, filePath: string): CodeStructure {
    const tsRegex = {
      interface: /(?:export\s+)?interface\s+(\w+)/g,
      type: /(?:export\s+)?type\s+(\w+)/g,
      function: /(?:export\s+)?(?:const|function)\s+(\w+)/g,
      class: /(?:export\s+)?class\s+(\w+)/g,
      import: /import\s+(?:{([^}]+)}|(\w+)|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g,
      export: /export\s+(?:default\s+)?(?:const|function|class|interface|type)\s+(\w+)/g,
    };

    const symbols: Symbol[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const dependencies = new Set<string>();

    const lines = content.split('\n');

    let match;
    while ((match = tsRegex.interface.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'interface',
        line,
        column: 0,
        scope: match[0].includes('export') ? 'export' : 'local',
      });
    }

    while ((match = tsRegex.type.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'type',
        line,
        column: 0,
        scope: match[0].includes('export') ? 'export' : 'local',
      });
    }

    while ((match = tsRegex.function.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'function',
        line,
        column: 0,
        scope: match[0].includes('export') ? 'export' : 'local',
      });
    }

    while ((match = tsRegex.class.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'class',
        line,
        column: 0,
        scope: match[0].includes('export') ? 'export' : 'local',
      });
    }

    while ((match = tsRegex.import.exec(content)) !== null) {
      const namedImports = match[1]?.split(',').map(s => s.trim()) || [];
      const defaultImport = match[2];
      const namespaceImport = match[3];
      const source = match[4];

      dependencies.add(source);

      imports.push({
        source,
        imports: namedImports.length > 0 ? namedImports :
                defaultImport ? [defaultImport] :
                namespaceImport ? [namespaceImport] : [],
        isDefault: !!defaultImport,
        isNamespace: !!namespaceImport,
      });
    }

    while ((match = tsRegex.export.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'unknown',
        isDefault: match[0].includes('default'),
      });
    }

    return {
      symbols,
      imports,
      exports,
      dependencies: Array.from(dependencies),
      complexity: this.calculateComplexity(symbols),
      linesOfCode: lines.length,
    };
  }

  private traverseAST(
    node: any,
    symbols: Symbol[],
    imports: ImportInfo[],
    exports: ExportInfo[],
    dependencies: Set<string>
  ): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ImportDeclaration') {
      const source = node.source.value;
      dependencies.add(source);

      const importNames: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      if (node.specifiers) {
        node.specifiers.forEach((spec: any) => {
          if (spec.type === 'ImportDefaultSpecifier') {
            importNames.push(spec.local.name);
            isDefault = true;
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            importNames.push(spec.local.name);
            isNamespace = true;
          } else if (spec.type === 'ImportSpecifier') {
            importNames.push(spec.imported.name);
          }
        });
      }

      imports.push({ source, imports: importNames, isDefault, isNamespace });
    }

    if (node.type === 'FunctionDeclaration' && node.id) {
      symbols.push({
        name: node.id.name,
        type: 'function',
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        scope: 'local',
      });
    }

    if (node.type === 'ClassDeclaration' && node.id) {
      symbols.push({
        name: node.id.name,
        type: 'class',
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        scope: 'local',
      });
    }

    if (node.type === 'VariableDeclaration') {
      node.declarations?.forEach((decl: any) => {
        if (decl.id?.name) {
          symbols.push({
            name: decl.id.name,
            type: 'variable',
            line: decl.loc?.start.line || 0,
            column: decl.loc?.start.column || 0,
            scope: 'local',
          });
        }
      });
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      if (Array.isArray(node[key])) {
        node[key].forEach((child: any) => this.traverseAST(child, symbols, imports, exports, dependencies));
      } else if (typeof node[key] === 'object') {
        this.traverseAST(node[key], symbols, imports, exports, dependencies);
      }
    }
  }

  private calculateComplexity(symbols: Symbol[]): number {
    return symbols.filter(s => s.type === 'function' || s.type === 'class').length;
  }

  findSymbolAtPosition(structure: CodeStructure, line: number, column: number): Symbol | null {
    return structure.symbols.find(
      s => s.line === line && Math.abs(s.column - column) < 20
    ) || null;
  }

  findSymbolByName(structure: CodeStructure, name: string): Symbol | null {
    return structure.symbols.find(s => s.name === name) || null;
  }

  getSymbolsInRange(structure: CodeStructure, startLine: number, endLine: number): Symbol[] {
    return structure.symbols.filter(s => s.line >= startLine && s.line <= endLine);
  }
}
