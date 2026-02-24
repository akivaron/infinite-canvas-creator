import { parse } from 'esprima';
import type { FileContext, CodeContext, ProjectStructure } from '../types/agent.js';

export class ContextAnalyzer {
  analyzeFile(path: string, content: string): FileContext {
    const language = this.detectLanguage(path);
    const imports = this.extractImports(content, language);
    const exports = this.extractExports(content, language);

    return {
      path,
      content,
      language,
      imports,
      exports,
    };
  }

  detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'sql': 'sql',
      'md': 'markdown',
    };
    return langMap[ext || ''] || 'text';
  }

  extractImports(content: string, language: string): string[] {
    const imports: string[] = [];

    if (language === 'typescript' || language === 'typescriptreact' ||
        language === 'javascript' || language === 'javascriptreact') {
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (language === 'python') {
      const importRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1] || match[2]);
      }
    }

    return [...new Set(imports)];
  }

  extractExports(content: string, language: string): string[] {
    const exports: string[] = [];

    if (language === 'typescript' || language === 'typescriptreact' ||
        language === 'javascript' || language === 'javascriptreact') {
      const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    return [...new Set(exports)];
  }

  findRelatedFiles(currentFile: FileContext, allFiles: FileContext[]): FileContext[] {
    const related: FileContext[] = [];
    const currentImports = new Set(currentFile.imports || []);

    for (const file of allFiles) {
      if (file.path === currentFile.path) continue;

      const fileExports = new Set(file.exports || []);
      const hasSharedDependency = (file.imports || []).some(imp => currentImports.has(imp));
      const importsCurrentFile = (file.imports || []).some(imp =>
        imp.includes(currentFile.path.replace(/\.[^.]+$/, ''))
      );
      const currentImportsFile = (currentFile.imports || []).some(imp =>
        imp.includes(file.path.replace(/\.[^.]+$/, ''))
      );

      if (hasSharedDependency || importsCurrentFile || currentImportsFile) {
        related.push(file);
      }
    }

    return related.slice(0, 5);
  }

  buildProjectStructure(files: FileContext[], packageJson?: any): ProjectStructure {
    const structure: ProjectStructure = {
      files: files.map(f => f.path),
      directories: this.extractDirectories(files.map(f => f.path)),
      dependencies: packageJson?.dependencies || {},
    };

    if (packageJson?.dependencies) {
      if (packageJson.dependencies['react']) structure.framework = 'react';
      if (packageJson.dependencies['vue']) structure.framework = 'vue';
      if (packageJson.dependencies['@angular/core']) structure.framework = 'angular';
      if (packageJson.dependencies['next']) structure.framework = 'next';
      if (packageJson.dependencies['express']) structure.framework = 'express';
    }

    const languages = new Set(files.map(f => f.language));
    if (languages.has('typescript') || languages.has('typescriptreact')) {
      structure.language = 'typescript';
    } else if (languages.has('javascript') || languages.has('javascriptreact')) {
      structure.language = 'javascript';
    }

    return structure;
  }

  private extractDirectories(filePaths: string[]): string[] {
    const dirs = new Set<string>();
    filePaths.forEach(path => {
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    });
    return Array.from(dirs).sort();
  }

  buildContextPrompt(context: CodeContext): string {
    let prompt = '# Project Context\n\n';

    if (context.projectStructure.framework) {
      prompt += `Framework: ${context.projectStructure.framework}\n`;
    }
    if (context.projectStructure.language) {
      prompt += `Language: ${context.projectStructure.language}\n`;
    }

    prompt += `\n## Project Structure\n`;
    prompt += `Files: ${context.projectStructure.files.length}\n`;
    prompt += `Key directories: ${context.projectStructure.directories.slice(0, 5).join(', ')}\n`;

    if (context.currentFile) {
      prompt += `\n## Current File: ${context.currentFile.path}\n`;
      prompt += `Language: ${context.currentFile.language}\n`;
      if (context.currentFile.imports?.length) {
        prompt += `Imports: ${context.currentFile.imports.slice(0, 10).join(', ')}\n`;
      }
    }

    if (context.relatedFiles.length > 0) {
      prompt += `\n## Related Files (${context.relatedFiles.length})\n`;
      context.relatedFiles.forEach(file => {
        prompt += `- ${file.path}\n`;
      });
    }

    if (context.recentChanges.length > 0) {
      prompt += `\n## Recent Changes\n`;
      context.recentChanges.slice(0, 3).forEach(change => {
        prompt += `- ${change.type}: ${change.path}\n`;
      });
    }

    return prompt;
  }
}
