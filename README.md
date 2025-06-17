# Computer Use Playwright SDK

A TypeScript SDK that combines Anthropic's Computer Use capabilities with Playwright for browser automation tasks.

## Installation

```bash
npm install @onkernel/cu-playwright-ts
```

## Usage

```typescript
import { chromium } from 'playwright';
import { samplingLoop } from '@onkernel/cu-playwright-ts';

const browser = await chromium.launch();
const page = await browser.newPage();
 await page.goto("https://news.ycombinator.com/newest");

const messages = await samplingLoop({
  model: 'claude-sonnet-4-20250514',
  messages: [{
    role: 'user',
    content: 'Go to https://example.com and click the search button'
  }],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  playwrightPage: page,
});

await browser.close();
```

## API

### `samplingLoop(options)`

The main function that executes Computer Use tasks with Playwright.

**Parameters:**
- `model` (string): Anthropic model to use (e.g., 'claude-3-5-sonnet-20241022')
- `messages` (BetaMessageParam[]): Array of conversation messages
- `apiKey` (string): Your Anthropic API key
- `playwrightPage` (Page): Playwright page instance
- `systemPromptSuffix?` (string): Optional additional system prompt
- `maxTokens?` (number): Maximum tokens for response (default: 4096)
- `toolVersion?` (ToolVersion): Computer Use tool version to use
- `thinkingBudget?` (number): Token budget for AI thinking
- `tokenEfficientToolsBeta?` (boolean): Enable token-efficient tools beta
- `onlyNMostRecentImages?` (number): Limit number of recent images

**Returns:** Promise<BetaMessageParam[]> - Array of conversation messages

## Environment Variables

Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Example

See `example.ts` for a complete working example.

## Requirements

- Node.js 18+
- TypeScript 5+
- Playwright 1.52+
- Anthropic API key

## License

MIT
