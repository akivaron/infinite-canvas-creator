# Auto Improve Prompt Feature

This feature automatically enhances user prompts using AI to get better code generation results and generates appropriate captions for nodes.

## How It Works

### 1. Prompt Improvement
When a user creates a node with a prompt/description, the system:
- Analyzes the original prompt
- Enhances it with specific technical details
- Clarifies ambiguous requirements
- Adds modern design principles
- Specifies best practices
- Makes it more actionable

### 2. Caption Generation
Simultaneously generates a short, catchy 3-5 word title that:
- Captures the essence of the project
- Is concise and memorable
- Automatically updates the node title

## Implementation

### Core Function: `improvePrompt()`
Located in: `src/lib/openrouter.ts`

```typescript
export async function improvePrompt(
  apiKey: string,
  model: string,
  originalPrompt: string,
  platform: string
): Promise<{ improvedPrompt: string; caption: string }>
```

**Returns:**
- `improvedPrompt`: Enhanced version with more details
- `caption`: Short project title (3-5 words)

### Integration Points

#### 1. Initial Generation
File: `src/components/canvas/CanvasNodeCard.tsx` (line ~170)

When generating variations for the first time:
- Improves the prompt before AI generation
- Updates node title with generated caption
- Shows progress message: "Improving prompt..."

#### 2. Regeneration
File: `src/components/canvas/CanvasNodeCard.tsx` (line ~282)

When user clicks regenerate:
- Improves the prompt again
- Updates title if caption is generated
- Ensures consistent quality across regenerations

### Generation Flow

```
User Input (prompt)
    ↓
Auto Improve (if enabled)
    ├─→ Enhanced Prompt
    └─→ Generated Caption
         ↓
AI Code Generation
    ↓
Update Node Title
    ↓
Display Results
```

## Features

### Automatic Mode
- Enabled by default (`autoImprove: boolean = true`)
- Seamlessly integrates into existing workflow
- No user action required

### Progress Tracking
Shows progress messages:
- "Improving prompt..." - During prompt enhancement
- "Optimizing for better results" - Detail message

### Smart Title Updates
- Only updates title when caption is successfully generated
- Preserves original title if improvement fails
- Works for both initial generation and regeneration

## Benefits

1. **Better Results**: Enhanced prompts lead to more accurate and detailed code generation
2. **Consistent Naming**: Auto-generated captions provide meaningful node titles
3. **User Experience**: Seamless integration without additional user input
4. **Flexibility**: Can be disabled by passing `autoImprove: false`

## Example

**Original Prompt:**
```
create a todo app
```

**Improved Prompt:**
```
Create a modern, responsive todo application with the following features:
- Clean, minimalist UI with smooth animations
- Add, edit, delete, and mark tasks as complete
- Filter tasks by status (all, active, completed)
- Persistent storage using localStorage
- Mobile-friendly responsive design
- Keyboard shortcuts for power users
- Dark mode support
Best practices: Component-based architecture, TypeScript for type safety,
proper state management, and accessibility compliance.
```

**Generated Caption:**
```
Modern Todo Manager
```

## Technical Details

### Model Selection
Uses the same model selected for code generation to ensure consistency.

### Error Handling
If prompt improvement fails:
- Falls back to original prompt
- Uses default caption "New Project"
- Continues with normal generation flow

### Performance
- Adds ~1-2 seconds to generation time
- Only runs once per generation/regeneration
- Parallel execution with code generation preparation

## Configuration

Currently enabled by default. To disable:

```typescript
await generateFullPageWithAI(
  title,
  description,
  platform,
  apiKey,
  modelId,
  language,
  onProgress,
  false  // Disable auto-improve
);
```

## Future Enhancements

Potential improvements:
- User toggle in settings to enable/disable
- Show original vs improved prompt in UI
- Custom improvement templates per platform
- Learn from user preferences
- Batch improvement for multiple nodes
