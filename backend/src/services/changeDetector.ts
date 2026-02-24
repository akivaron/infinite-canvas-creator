import { createHash } from 'crypto';
import type { FileContext } from '../types/agent.js';

export interface FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  timestamp: number;
  oldContent?: string;
  newContent?: string;
  diff?: string;
  affectedSymbols?: string[];
}

export interface ChangeImpact {
  directlyAffected: string[];
  indirectlyAffected: string[];
  breakingChanges: string[];
  suggestions: string[];
}

export class ChangeDetector {
  private fileHashes: Map<string, string> = new Map();
  private fileContents: Map<string, string> = new Map();
  private changeHistory: FileChange[] = [];

  computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  detectChanges(files: FileContext[]): FileChange[] {
    const changes: FileChange[] = [];
    const currentPaths = new Set(files.map(f => f.path));

    files.forEach(file => {
      const newHash = this.computeHash(file.content);
      const oldHash = this.fileHashes.get(file.path);
      const oldContent = this.fileContents.get(file.path);

      if (!oldHash) {
        changes.push({
          path: file.path,
          type: 'created',
          timestamp: Date.now(),
          newContent: file.content,
        });
      } else if (oldHash !== newHash) {
        changes.push({
          path: file.path,
          type: 'modified',
          timestamp: Date.now(),
          oldContent,
          newContent: file.content,
        });
      }

      this.fileHashes.set(file.path, newHash);
      this.fileContents.set(file.path, file.content);
    });

    this.fileHashes.forEach((hash, path) => {
      if (!currentPaths.has(path)) {
        changes.push({
          path,
          type: 'deleted',
          timestamp: Date.now(),
          oldContent: this.fileContents.get(path),
        });
        this.fileHashes.delete(path);
        this.fileContents.delete(path);
      }
    });

    this.changeHistory.push(...changes);

    if (this.changeHistory.length > 100) {
      this.changeHistory = this.changeHistory.slice(-100);
    }

    return changes;
  }

  getRecentChanges(limit: number = 10): FileChange[] {
    return this.changeHistory.slice(-limit).reverse();
  }

  getChangesForFile(filePath: string, limit: number = 5): FileChange[] {
    return this.changeHistory
      .filter(c => c.path === filePath)
      .slice(-limit)
      .reverse();
  }

  analyzeImpact(change: FileChange, allFiles: FileContext[]): ChangeImpact {
    const directlyAffected: string[] = [];
    const indirectlyAffected: string[] = [];
    const breakingChanges: string[] = [];
    const suggestions: string[] = [];

    if (change.type === 'deleted') {
      allFiles.forEach(file => {
        const importPath = change.path.replace(/\.(ts|tsx|js|jsx)$/, '');
        if (file.content.includes(importPath)) {
          directlyAffected.push(file.path);
          breakingChanges.push(`${file.path} imports deleted file ${change.path}`);
        }
      });

      suggestions.push(`Remove imports of ${change.path} from affected files`);
      return { directlyAffected, indirectlyAffected, breakingChanges, suggestions };
    }

    if (change.type === 'modified' && change.oldContent && change.newContent) {
      const oldExports = this.extractExports(change.oldContent);
      const newExports = this.extractExports(change.newContent);

      const removedExports = oldExports.filter(e => !newExports.includes(e));
      const addedExports = newExports.filter(e => !oldExports.includes(e));

      if (removedExports.length > 0) {
        allFiles.forEach(file => {
          removedExports.forEach(exp => {
            if (file.content.includes(exp) && file.path !== change.path) {
              directlyAffected.push(file.path);
              breakingChanges.push(`${file.path} uses removed export ${exp} from ${change.path}`);
            }
          });
        });

        suggestions.push(`Update imports in affected files to use new exports`);
      }

      if (addedExports.length > 0) {
        suggestions.push(`Consider using new exports: ${addedExports.join(', ')}`);
      }

      const importPath = change.path.replace(/\.(ts|tsx|js|jsx)$/, '');
      allFiles.forEach(file => {
        if (file.content.includes(importPath) && file.path !== change.path) {
          if (!directlyAffected.includes(file.path)) {
            indirectlyAffected.push(file.path);
          }
        }
      });
    }

    return { directlyAffected, indirectlyAffected, breakingChanges, suggestions };
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type|enum)\s+(\w+)/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
      exports.push(...names);
    }

    return exports;
  }

  summarizeChanges(changes: FileChange[]): string {
    if (changes.length === 0) return 'No recent changes';

    const created = changes.filter(c => c.type === 'created').length;
    const modified = changes.filter(c => c.type === 'modified').length;
    const deleted = changes.filter(c => c.type === 'deleted').length;

    let summary = `Recent changes: `;
    if (created > 0) summary += `${created} created, `;
    if (modified > 0) summary += `${modified} modified, `;
    if (deleted > 0) summary += `${deleted} deleted`;

    return summary.replace(/, $/, '');
  }

  getChangeVelocity(timeWindowMs: number = 60000): number {
    const now = Date.now();
    const recentChanges = this.changeHistory.filter(
      c => now - c.timestamp < timeWindowMs
    );

    return recentChanges.length;
  }

  getMostChangedFiles(limit: number = 5): { path: string; changes: number }[] {
    const changeCount = new Map<string, number>();

    this.changeHistory.forEach(change => {
      changeCount.set(change.path, (changeCount.get(change.path) || 0) + 1);
    });

    return Array.from(changeCount.entries())
      .map(([path, changes]) => ({ path, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, limit);
  }

  detectPatterns(): { pattern: string; confidence: number }[] {
    const patterns: { pattern: string; confidence: number }[] = [];

    const recentChanges = this.getRecentChanges(20);

    const fileTypes = new Map<string, number>();
    recentChanges.forEach(change => {
      const ext = change.path.split('.').pop() || '';
      fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
    });

    const mostCommonType = Array.from(fileTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonType && mostCommonType[1] >= 3) {
      patterns.push({
        pattern: `Frequently modifying ${mostCommonType[0]} files`,
        confidence: Math.min(mostCommonType[1] / 10, 1),
      });
    }

    const directories = new Map<string, number>();
    recentChanges.forEach(change => {
      const dir = change.path.split('/').slice(0, -1).join('/');
      directories.set(dir, (directories.get(dir) || 0) + 1);
    });

    const focusedDir = Array.from(directories.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (focusedDir && focusedDir[1] >= 3) {
      patterns.push({
        pattern: `Working in ${focusedDir[0]} directory`,
        confidence: Math.min(focusedDir[1] / 10, 1),
      });
    }

    return patterns;
  }

  clear(): void {
    this.fileHashes.clear();
    this.fileContents.clear();
    this.changeHistory = [];
  }
}
