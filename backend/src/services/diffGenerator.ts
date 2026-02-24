import { diffLines, diffWords, Change } from 'diff';

export class DiffGenerator {
  generateDiff(oldContent: string, newContent: string): string {
    const changes = diffLines(oldContent, newContent);
    return this.formatUnifiedDiff(changes, oldContent, newContent);
  }

  generateInlineDiff(oldContent: string, newContent: string): Change[] {
    return diffWords(oldContent, newContent);
  }

  private formatUnifiedDiff(changes: Change[], oldContent: string, newContent: string): string {
    let diff = '';
    let oldLineNum = 1;
    let newLineNum = 1;

    changes.forEach(change => {
      const lines = change.value.split('\n').filter(l => l.length > 0);

      if (change.added) {
        lines.forEach(line => {
          diff += `+ ${line}\n`;
          newLineNum++;
        });
      } else if (change.removed) {
        lines.forEach(line => {
          diff += `- ${line}\n`;
          oldLineNum++;
        });
      } else {
        lines.forEach(line => {
          diff += `  ${line}\n`;
          oldLineNum++;
          newLineNum++;
        });
      }
    });

    return diff;
  }

  applyPatch(original: string, patch: string): string {
    const lines = original.split('\n');
    const patchLines = patch.split('\n');
    const result: string[] = [];

    let lineIndex = 0;

    for (const patchLine of patchLines) {
      if (patchLine.startsWith('+ ')) {
        result.push(patchLine.slice(2));
      } else if (patchLine.startsWith('- ')) {
        lineIndex++;
      } else if (patchLine.startsWith('  ')) {
        result.push(lines[lineIndex]);
        lineIndex++;
      }
    }

    while (lineIndex < lines.length) {
      result.push(lines[lineIndex]);
      lineIndex++;
    }

    return result.join('\n');
  }

  generateSmartEdit(
    content: string,
    selectionStart: number,
    selectionEnd: number,
    replacement: string
  ): { newContent: string; diff: string } {
    const before = content.slice(0, selectionStart);
    const after = content.slice(selectionEnd);
    const newContent = before + replacement + after;

    const diff = this.generateDiff(content, newContent);

    return { newContent, diff };
  }

  highlightChanges(changes: Change[]): string {
    return changes
      .map(change => {
        if (change.added) {
          return `<ins>${change.value}</ins>`;
        } else if (change.removed) {
          return `<del>${change.value}</del>`;
        }
        return change.value;
      })
      .join('');
  }

  summarizeChanges(changes: Change[]): {
    additions: number;
    deletions: number;
    modifications: number;
  } {
    let additions = 0;
    let deletions = 0;

    changes.forEach(change => {
      const lineCount = change.value.split('\n').length - 1;
      if (change.added) additions += lineCount;
      if (change.removed) deletions += lineCount;
    });

    return {
      additions,
      deletions,
      modifications: Math.min(additions, deletions),
    };
  }
}
