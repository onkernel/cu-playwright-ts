# Computer Use Playwright SDK

A TypeScript SDK that combines Anthropic's Computer Use capabilities with Playwright for browser automation tasks. This SDK provides a clean, type-safe interface for automating browser interactions using Claude's computer use abilities.

## Features

- 🤖 **Simple API**: Single `ComputerUseAgent` class for all computer use tasks
- 🔄 **Dual Response Types**: Support for both text and structured (JSON) responses
- 🛡️ **Type Safety**: Full TypeScript support with Zod schema validation
- ⚡ **Optimized**: Clean error handling and robust JSON parsing
- 🎯 **Focused**: Clean API surface with sensible defaults

## Installation

```bash
npm install cu-playwright-ts
# or
yarn add cu-playwright-ts
# or
bun add cu-playwright-ts
```

## Quick Start

```typescript
import { chromium } from 'playwright';
import { ComputerUseAgent } from 'cu-playwright-ts';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Navigate to Hacker News manually first
await page.goto("https://news.ycombinator.com/");

const agent = new ComputerUseAgent({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  page,
});

// Simple text response
const answer = await agent.execute('Tell me the title of the top story');
console.log(answer);

await browser.close();
```

## API Reference

### `ComputerUseAgent`

The main class for computer use automation.

#### Constructor

```typescript
new ComputerUseAgent(options: {
  apiKey: string;
  page: Page;
  model?: string;
})
```

**Parameters:**
- `apiKey` (string): Your Anthropic API key. Get one from [Anthropic Console](https://console.anthropic.com/)
- `page` (Page): Playwright page instance to control
- `model` (string, optional): Anthropic model to use. Defaults to `'claude-3-5-sonnet-20241022'`

**Supported Models:**
See [Anthropic's Computer Use documentation](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/computer-use-tool#model-compatibility) for the latest model compatibility.

#### `execute()` Method

```typescript
async execute<T = string>(
  query: string,
  schema?: z.ZodSchema<T>,
  options?: {
    systemPromptSuffix?: string;
    thinkingBudget?: number;
  }
): Promise<T>
```

**Parameters:**

- **`query`** (string): The task description for Claude to execute
  
- **`schema`** (ZodSchema, optional): Zod schema for structured responses. When provided, the response will be validated against this schema
  
- **`options`** (object, optional):
  - **`systemPromptSuffix`** (string): Additional instructions appended to the system prompt
  - **`thinkingBudget`** (number): Token budget for Claude's internal reasoning process. Default: `1024`. See [Extended Thinking documentation](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) for details

**Returns:** 
- `Promise<T>`: When `schema` is provided, returns validated data of type `T`
- `Promise<string>`: When no `schema` is provided, returns the text response

## Usage Examples

### Text Response

```typescript
import { ComputerUseAgent } from 'cu-playwright-ts';

// Navigate to the target page first
await page.goto("https://news.ycombinator.com/");

const agent = new ComputerUseAgent({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  page,
});

const result = await agent.execute(
  'Tell me the title of the top story on this page'
);
console.log(result); // "Title of the top story"
```

### Structured Response with Zod

```typescript
import { z } from 'zod';
import { ComputerUseAgent } from 'cu-playwright-ts';

const agent = new ComputerUseAgent({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  page,
});

const HackerNewsStory = z.object({
  title: z.string(),
  points: z.number(),
  author: z.string(),
  comments: z.number(),
  url: z.string().optional(),
});

const stories = await agent.execute(
  'Get the top 5 Hacker News stories with their details',
  z.array(HackerNewsStory).max(5)
);

console.log(stories);
// [
//   {
//     title: "Example Story",
//     points: 150,
//     author: "user123",
//     comments: 42,
//     url: "https://example.com"
//   },
//   ...
// ]
```

### Advanced Options

```typescript
const result = await agent.execute(
  'Complex task requiring more thinking',
  undefined, // No schema for text response
  {
    systemPromptSuffix: 'Be extra careful with form submissions.',
    thinkingBudget: 4096, // More thinking tokens for complex tasks
  }
);
```

## Environment Setup

1. **Anthropic API Key**: Set your API key as an environment variable:
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

2. **Playwright**: Install Playwright and browser dependencies:
   ```bash
   npx playwright install
   ```

## Computer Use Parameters

This SDK leverages Anthropic's Computer Use API with the following key parameters:

### Model Selection
- **Claude 3.5 Sonnet**: Best balance of speed and capability for most tasks
- **Claude 4 Models**: Enhanced reasoning with extended thinking capabilities
- **Claude 3.7 Sonnet**: Advanced reasoning with thinking transparency

### Thinking Budget
The `thinkingBudget` parameter controls Claude's internal reasoning process:
- **1024 tokens** (default): Suitable for simple tasks
- **4096+ tokens**: Better for complex reasoning tasks
- **16k+ tokens**: Recommended for highly complex multi-step operations

See [Anthropic's Extended Thinking guide](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#working-with-thinking-budgets) for optimization tips.

## Error Handling

The SDK includes built-in error handling:

```typescript
try {
  const result = await agent.execute('Your task here');
  console.log(result);
} catch (error) {
  if (error.message.includes('No response received')) {
    console.log('Agent did not receive a response from Claude');
  } else {
    console.log('Other error:', error.message);
  }
}
```

## Best Practices

1. **Use specific, clear instructions**: "Click the red 'Submit' button" vs "click submit"

2. **For complex tasks, break them down**: Use step-by-step instructions in your query

3. **Optimize thinking budget**: Start with default (1024) and increase for complex tasks

4. **Handle errors gracefully**: Implement proper error handling for production use

5. **Use structured responses**: When you need specific data format, use Zod schemas

6. **Test in headless: false**: During development, run with visible browser to debug

## Security Considerations

⚠️ **Important**: Computer use can interact with any visible application. Always:

- Run in isolated environments (containers/VMs) for production
- Avoid providing access to sensitive accounts or data
- Review Claude's actions in logs before production deployment
- Use allowlisted domains when possible

See [Anthropic's Computer Use Security Guide](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/computer-use-tool#security-considerations) for detailed security recommendations.

## Requirements

- Node.js 18+
- TypeScript 5+
- Playwright 1.52+
- Anthropic API key

## Related Resources

- [Anthropic Computer Use Documentation](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/computer-use-tool)
- [Extended Thinking Guide](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Playwright Documentation](https://playwright.dev/)
- [Zod Documentation](https://zod.dev/)

## License

MIT

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.