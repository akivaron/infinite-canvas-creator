import type { GenerationRequest, GenerationResponse } from '../types/agent.js';

export interface ConversationTurn {
  id: string;
  timestamp: number;
  request: GenerationRequest;
  response?: GenerationResponse;
  feedback?: 'positive' | 'negative';
  applied: boolean;
}

export interface ConversationContext {
  sessionId: string;
  projectId: string;
  turns: ConversationTurn[];
  recentFiles: string[];
  userPreferences: UserPreferences;
  learnings: Learning[];
}

export interface UserPreferences {
  preferredModel?: string;
  codeStyle?: {
    indentation?: 'tabs' | 'spaces';
    semicolons?: boolean;
    quotes?: 'single' | 'double';
    trailingComma?: boolean;
  };
  frameworks?: string[];
  libraries?: string[];
}

export interface Learning {
  pattern: string;
  context: string;
  confidence: number;
  examples: string[];
}

export class ConversationMemory {
  private contexts: Map<string, ConversationContext> = new Map();

  createSession(sessionId: string, projectId: string): ConversationContext {
    const context: ConversationContext = {
      sessionId,
      projectId,
      turns: [],
      recentFiles: [],
      userPreferences: {},
      learnings: [],
    };

    this.contexts.set(sessionId, context);
    return context;
  }

  getSession(sessionId: string): ConversationContext | null {
    return this.contexts.get(sessionId) || null;
  }

  addTurn(
    sessionId: string,
    request: GenerationRequest,
    response?: GenerationResponse
  ): ConversationTurn {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error('Session not found');

    const turn: ConversationTurn = {
      id: this.generateId(),
      timestamp: Date.now(),
      request,
      response,
      applied: false,
    };

    context.turns.push(turn);

    if (context.turns.length > 50) {
      context.turns = context.turns.slice(-50);
    }

    if (request.targetFile) {
      this.trackFile(sessionId, request.targetFile);
    }

    return turn;
  }

  markApplied(sessionId: string, turnId: string): void {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    const turn = context.turns.find(t => t.id === turnId);
    if (turn) {
      turn.applied = true;
    }
  }

  addFeedback(sessionId: string, turnId: string, feedback: 'positive' | 'negative'): void {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    const turn = context.turns.find(t => t.id === turnId);
    if (turn) {
      turn.feedback = feedback;

      if (feedback === 'positive' && turn.response) {
        this.learnFromSuccess(context, turn);
      }
    }
  }

  private learnFromSuccess(context: ConversationContext, turn: ConversationTurn): void {
    const prompt = turn.request.prompt.toLowerCase();

    if (prompt.includes('component') && turn.response?.type === 'file') {
      this.addLearning(context, {
        pattern: 'component creation',
        context: 'User prefers certain component patterns',
        confidence: 0.7,
        examples: [turn.request.prompt],
      });
    }

    if (turn.request.context.projectStructure.framework) {
      const framework = turn.request.context.projectStructure.framework;
      if (!context.userPreferences.frameworks?.includes(framework)) {
        context.userPreferences.frameworks = [
          ...(context.userPreferences.frameworks || []),
          framework,
        ];
      }
    }
  }

  private addLearning(context: ConversationContext, learning: Learning): void {
    const existing = context.learnings.find(l => l.pattern === learning.pattern);

    if (existing) {
      existing.confidence = Math.min(existing.confidence + 0.1, 1);
      existing.examples.push(...learning.examples);
      if (existing.examples.length > 5) {
        existing.examples = existing.examples.slice(-5);
      }
    } else {
      context.learnings.push(learning);
    }

    if (context.learnings.length > 20) {
      context.learnings.sort((a, b) => b.confidence - a.confidence);
      context.learnings = context.learnings.slice(0, 20);
    }
  }

  buildContextualPrompt(sessionId: string): string {
    const context = this.contexts.get(sessionId);
    if (!context) return '';

    let prompt = '';

    if (context.turns.length > 0) {
      prompt += '# Conversation History\n\n';
      const recentTurns = context.turns.slice(-5);

      recentTurns.forEach((turn, index) => {
        prompt += `## Turn ${index + 1}\n`;
        prompt += `User: ${turn.request.prompt}\n`;
        if (turn.response?.explanation) {
          prompt += `Assistant: ${turn.response.explanation}\n`;
        }
        if (turn.feedback === 'positive') {
          prompt += `Feedback: User liked this response\n`;
        }
        prompt += '\n';
      });
    }

    if (context.recentFiles.length > 0) {
      prompt += '# Recently Modified Files\n';
      prompt += context.recentFiles.slice(-5).join(', ') + '\n\n';
    }

    if (context.userPreferences.codeStyle) {
      prompt += '# User Code Style Preferences\n';
      const style = context.userPreferences.codeStyle;
      if (style.indentation) prompt += `- Indentation: ${style.indentation}\n`;
      if (style.semicolons !== undefined) prompt += `- Semicolons: ${style.semicolons ? 'yes' : 'no'}\n`;
      if (style.quotes) prompt += `- Quotes: ${style.quotes}\n`;
      if (style.trailingComma !== undefined) prompt += `- Trailing comma: ${style.trailingComma ? 'yes' : 'no'}\n`;
      prompt += '\n';
    }

    if (context.learnings.length > 0) {
      prompt += '# Learned Patterns\n';
      context.learnings.slice(0, 5).forEach(learning => {
        prompt += `- ${learning.pattern}: ${learning.context} (confidence: ${Math.round(learning.confidence * 100)}%)\n`;
      });
      prompt += '\n';
    }

    return prompt;
  }

  detectCodeStyle(code: string): Partial<UserPreferences['codeStyle']> {
    const style: Partial<UserPreferences['codeStyle']> = {};

    const hasSpaces = /^[ ]{2,}/.test(code.split('\n').find(l => /^[ ]+\w/.test(l)) || '');
    const hasTabs = /^\t/.test(code.split('\n').find(l => /^\t/.test(l)) || '');
    style.indentation = hasTabs ? 'tabs' : hasSpaces ? 'spaces' : undefined;

    const semicolonCount = (code.match(/;/g) || []).length;
    const statementCount = (code.match(/\n/g) || []).length;
    style.semicolons = semicolonCount > statementCount * 0.5;

    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;
    style.quotes = singleQuotes > doubleQuotes ? 'single' : 'double';

    style.trailingComma = /,\s*[}\]]/.test(code);

    return style;
  }

  updatePreferences(sessionId: string, code: string): void {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    const detectedStyle = this.detectCodeStyle(code);

    context.userPreferences.codeStyle = {
      ...context.userPreferences.codeStyle,
      ...detectedStyle,
    };
  }

  private trackFile(sessionId: string, filePath: string): void {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    if (!context.recentFiles.includes(filePath)) {
      context.recentFiles.push(filePath);
    }

    if (context.recentFiles.length > 20) {
      context.recentFiles = context.recentFiles.slice(-20);
    }
  }

  getSimilarPastRequests(sessionId: string, currentPrompt: string, limit: number = 3): ConversationTurn[] {
    const context = this.contexts.get(sessionId);
    if (!context) return [];

    const currentWords = new Set(currentPrompt.toLowerCase().split(/\s+/));

    const scored = context.turns
      .filter(t => t.feedback === 'positive')
      .map(turn => {
        const turnWords = new Set(turn.request.prompt.toLowerCase().split(/\s+/));
        const intersection = new Set([...currentWords].filter(w => turnWords.has(w)));
        const similarity = intersection.size / Math.max(currentWords.size, turnWords.size);

        return { turn, similarity };
      })
      .filter(s => s.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored.map(s => s.turn);
  }

  getStatistics(sessionId: string): {
    totalTurns: number;
    appliedTurns: number;
    positiveFeedback: number;
    negativeFeedback: number;
    mostUsedMode: string;
    averageResponseTime?: number;
  } {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return {
        totalTurns: 0,
        appliedTurns: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        mostUsedMode: 'unknown',
      };
    }

    const modeCount = new Map<string, number>();
    context.turns.forEach(turn => {
      const mode = turn.request.mode;
      modeCount.set(mode, (modeCount.get(mode) || 0) + 1);
    });

    const mostUsedMode = Array.from(modeCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    return {
      totalTurns: context.turns.length,
      appliedTurns: context.turns.filter(t => t.applied).length,
      positiveFeedback: context.turns.filter(t => t.feedback === 'positive').length,
      negativeFeedback: context.turns.filter(t => t.feedback === 'negative').length,
      mostUsedMode,
    };
  }

  private generateId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clearSession(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  getAllSessions(): string[] {
    return Array.from(this.contexts.keys());
  }
}
