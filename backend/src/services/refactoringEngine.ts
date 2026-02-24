import type { FileContext } from '../types/agent.js';
import { DiffGenerator } from './diffGenerator.js';
import type { Symbol } from './astAnalyzer.js';

export interface RefactoringOperation {
  type: 'rename' | 'extract' | 'inline' | 'move' | 'changeSignature';
  files: FileRefactoring[];
  description: string;
}

export interface FileRefactoring {
  path: string;
  oldContent: string;
  newContent: string;
  diff: string;
}

export interface RenameOptions {
  oldName: string;
  newName: string;
  scope: 'file' | 'project';
}

export interface ExtractOptions {
  name: string;
  startLine: number;
  endLine: number;
  extractTo: 'function' | 'component' | 'hook';
}

export interface MoveOptions {
  symbols: string[];
  targetFile: string;
}

export class RefactoringEngine {
  private diffGenerator: DiffGenerator;

  constructor() {
    this.diffGenerator = new DiffGenerator();
  }

  async rename(
    files: FileContext[],
    targetFile: string,
    options: RenameOptions
  ): Promise<RefactoringOperation> {
    const refactorings: FileRefactoring[] = [];

    if (options.scope === 'file') {
      const file = files.find(f => f.path === targetFile);
      if (!file) throw new Error('Target file not found');

      const newContent = this.renameInFile(file.content, options.oldName, options.newName);
      const diff = this.diffGenerator.generateDiff(file.content, newContent);

      refactorings.push({
        path: file.path,
        oldContent: file.content,
        newContent,
        diff,
      });
    } else {
      for (const file of files) {
        const newContent = this.renameInFile(file.content, options.oldName, options.newName);

        if (newContent !== file.content) {
          const diff = this.diffGenerator.generateDiff(file.content, newContent);
          refactorings.push({
            path: file.path,
            oldContent: file.content,
            newContent,
            diff,
          });
        }
      }
    }

    return {
      type: 'rename',
      files: refactorings,
      description: `Renamed ${options.oldName} to ${options.newName}`,
    };
  }

  async extractFunction(
    file: FileContext,
    options: ExtractOptions
  ): Promise<RefactoringOperation> {
    const lines = file.content.split('\n');
    const extractedLines = lines.slice(options.startLine - 1, options.endLine);
    const extractedCode = extractedLines.join('\n');

    const indent = this.detectIndentation(lines[options.startLine - 1]);
    const params = this.detectParameters(extractedCode);

    let newFunction = '';
    if (options.extractTo === 'function') {
      newFunction = this.generateFunction(options.name, params, extractedCode, indent);
    } else if (options.extractTo === 'component') {
      newFunction = this.generateComponent(options.name, params, extractedCode);
    } else if (options.extractTo === 'hook') {
      newFunction = this.generateHook(options.name, params, extractedCode);
    }

    const callStatement = `${indent}${this.generateCall(options.name, params, options.extractTo)}`;

    const beforeExtraction = lines.slice(0, options.startLine - 1);
    const afterExtraction = lines.slice(options.endLine);

    const newContent = [
      ...beforeExtraction,
      newFunction,
      '',
      callStatement,
      ...afterExtraction,
    ].join('\n');

    const diff = this.diffGenerator.generateDiff(file.content, newContent);

    return {
      type: 'extract',
      files: [{
        path: file.path,
        oldContent: file.content,
        newContent,
        diff,
      }],
      description: `Extracted ${options.extractTo} ${options.name}`,
    };
  }

  async moveSymbols(
    files: FileContext[],
    sourceFile: string,
    options: MoveOptions
  ): Promise<RefactoringOperation> {
    const source = files.find(f => f.path === sourceFile);
    if (!source) throw new Error('Source file not found');

    const target = files.find(f => f.path === options.targetFile);
    if (!target) throw new Error('Target file not found');

    const { extractedCode, remainingCode } = this.extractSymbols(source.content, options.symbols);

    const newTargetContent = this.insertCode(target.content, extractedCode);

    const exportStatement = options.symbols.map(s => `export { ${s} }`).join('\n');
    const importStatement = `import { ${options.symbols.join(', ')} } from './${this.getRelativePath(sourceFile, options.targetFile)}';`;

    const newSourceContent = this.addImport(remainingCode, importStatement);

    const refactorings: FileRefactoring[] = [
      {
        path: sourceFile,
        oldContent: source.content,
        newContent: newSourceContent,
        diff: this.diffGenerator.generateDiff(source.content, newSourceContent),
      },
      {
        path: options.targetFile,
        oldContent: target.content,
        newContent: newTargetContent,
        diff: this.diffGenerator.generateDiff(target.content, newTargetContent),
      },
    ];

    for (const file of files) {
      if (file.path !== sourceFile && file.path !== options.targetFile) {
        const hasImport = this.hasImportFrom(file.content, sourceFile, options.symbols);
        if (hasImport) {
          const newContent = this.updateImportSource(
            file.content,
            sourceFile,
            options.targetFile,
            options.symbols
          );

          if (newContent !== file.content) {
            refactorings.push({
              path: file.path,
              oldContent: file.content,
              newContent,
              diff: this.diffGenerator.generateDiff(file.content, newContent),
            });
          }
        }
      }
    }

    return {
      type: 'move',
      files: refactorings,
      description: `Moved ${options.symbols.join(', ')} to ${options.targetFile}`,
    };
  }

  private renameInFile(content: string, oldName: string, newName: string): string {
    const wordBoundary = new RegExp(`\\b${oldName}\\b`, 'g');
    return content.replace(wordBoundary, newName);
  }

  private detectIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  private detectParameters(code: string): string[] {
    const params = new Set<string>();
    const varRegex = /\b([a-z_][a-zA-Z0-9_]*)\b/g;

    let match;
    while ((match = varRegex.exec(code)) !== null) {
      const name = match[1];
      if (!['const', 'let', 'var', 'function', 'if', 'else', 'return'].includes(name)) {
        params.add(name);
      }
    }

    return Array.from(params);
  }

  private generateFunction(name: string, params: string[], code: string, indent: string): string {
    const paramList = params.join(', ');
    return `${indent}function ${name}(${paramList}) {\n${code}\n${indent}}`;
  }

  private generateComponent(name: string, params: string[], code: string): string {
    const propsType = params.length > 0 ? `{ ${params.join(', ')} }` : '{}';
    return `function ${name}(props: ${propsType}) {\n${code}\n}`;
  }

  private generateHook(name: string, params: string[], code: string): string {
    const paramList = params.join(', ');
    return `function ${name}(${paramList}) {\n${code}\n}`;
  }

  private generateCall(name: string, params: string[], type: string): string {
    if (type === 'component') {
      return `<${name} ${params.map(p => `${p}={${p}}`).join(' ')} />`;
    }
    return `${name}(${params.join(', ')});`;
  }

  private extractSymbols(content: string, symbols: string[]): {
    extractedCode: string;
    remainingCode: string;
  } {
    const lines = content.split('\n');
    const extracted: string[] = [];
    const remaining: string[] = [];

    let inSymbol = false;
    let currentSymbol = '';
    let braceCount = 0;

    for (const line of lines) {
      if (!inSymbol) {
        const symbolMatch = symbols.find(s => line.includes(`function ${s}`) || line.includes(`const ${s}`) || line.includes(`class ${s}`));
        if (symbolMatch) {
          inSymbol = true;
          currentSymbol = symbolMatch;
          extracted.push(line);
          braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          continue;
        }
      }

      if (inSymbol) {
        extracted.push(line);
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

        if (braceCount === 0) {
          inSymbol = false;
          currentSymbol = '';
        }
        continue;
      }

      remaining.push(line);
    }

    return {
      extractedCode: extracted.join('\n'),
      remainingCode: remaining.join('\n'),
    };
  }

  private insertCode(targetContent: string, codeToInsert: string): string {
    const lines = targetContent.split('\n');

    const lastImportIndex = lines.findLastIndex(line => line.trim().startsWith('import'));
    const insertIndex = lastImportIndex + 2;

    lines.splice(insertIndex, 0, codeToInsert, '');

    return lines.join('\n');
  }

  private addImport(content: string, importStatement: string): string {
    const lines = content.split('\n');
    const lastImportIndex = lines.findLastIndex(line => line.trim().startsWith('import'));

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement);
    } else {
      lines.unshift(importStatement, '');
    }

    return lines.join('\n');
  }

  private hasImportFrom(content: string, sourceFile: string, symbols: string[]): boolean {
    const importPath = sourceFile.replace(/\.(ts|tsx|js|jsx)$/, '');
    return symbols.some(symbol => {
      const regex = new RegExp(`import.*${symbol}.*from.*['"].*${importPath}`, 'i');
      return regex.test(content);
    });
  }

  private updateImportSource(
    content: string,
    oldSource: string,
    newSource: string,
    symbols: string[]
  ): string {
    const oldPath = oldSource.replace(/\.(ts|tsx|js|jsx)$/, '');
    const newPath = newSource.replace(/\.(ts|tsx|js|jsx)$/, '');

    let newContent = content;

    symbols.forEach(symbol => {
      const regex = new RegExp(`(import.*${symbol}.*from.*['"])([^'"]*${oldPath}[^'"]*?)(['"])`, 'gi');
      newContent = newContent.replace(regex, `$1${newPath}$3`);
    });

    return newContent;
  }

  private getRelativePath(from: string, to: string): string {
    const fromParts = from.split('/').slice(0, -1);
    const toParts = to.split('/');

    let commonLength = 0;
    while (
      commonLength < fromParts.length &&
      commonLength < toParts.length &&
      fromParts[commonLength] === toParts[commonLength]
    ) {
      commonLength++;
    }

    const upLevels = fromParts.length - commonLength;
    const upPath = '../'.repeat(upLevels);
    const downPath = toParts.slice(commonLength).join('/');

    return (upPath + downPath).replace(/\.(ts|tsx|js|jsx)$/, '');
  }
}
