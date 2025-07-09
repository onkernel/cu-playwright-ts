import type { Page } from 'playwright';
import { ToolError, type ToolResult, type ComputerUseTool, type FunctionToolDef, type ActionParams } from './types/base';

// Supported Playwright methods - initially only goto
const SUPPORTED_METHODS = ['goto'] as const;
type SupportedMethod = typeof SUPPORTED_METHODS[number];

export type PlaywrightActionParams = ActionParams & {
  method: string;
  args: string[];
}

export class PlaywrightTool implements ComputerUseTool {
  name: 'playwright' = 'playwright';
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  toParams(): FunctionToolDef {
    return {
      name: this.name,
      type: 'custom',
      input_schema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The playwright function to call.',
            enum: SUPPORTED_METHODS,
          },
          args: {
            type: 'array',
            description: 'The required arguments',
            items: {
              type: 'string',
              description: 'The argument to pass to the function',
            },
          },
        },
        required: ['method', 'args'],
      },
    };
  }

  private validateMethod(method: string): method is SupportedMethod {
    return SUPPORTED_METHODS.includes(method as SupportedMethod);
  }

  private async executeGoto(args: string[]): Promise<ToolResult> {
    if (args.length !== 1) {
      throw new ToolError('goto method requires exactly one argument: the URL');
    }

    const url = args[0];
    if (!url || typeof url !== 'string') {
      throw new ToolError('URL must be a non-empty string');
    }

    // Normalize URL - handles both full URLs and bare hostnames
    let normalizedURL: string;
    try {
      const urlObj = new URL(url);
      normalizedURL = urlObj.href;
    } catch {
      try {
        const urlObj = new URL(`https://${url}`);
        normalizedURL = urlObj.href;
      } catch {
        throw new ToolError(`Invalid URL format: ${url}`);
      }
    }

    try {
      await this.page.goto(normalizedURL, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait a bit for the page to fully load
      await this.page.waitForTimeout(1000);
      
      const currentURL = this.page.url();
      const title = await this.page.title();
      
      return {
        output: `Successfully navigated to ${currentURL}. Page title: "${title}"`,
      };
    } catch (error) {
      throw new ToolError(`Failed to navigate to ${normalizedURL}: ${error}`);
    }
  }

  async call(params: PlaywrightActionParams): Promise<ToolResult> {
    const { method, args } = params as PlaywrightActionParams;

    if (!this.validateMethod(method)) {
      throw new ToolError(
        `Unsupported method: ${method}. Supported methods: ${SUPPORTED_METHODS.join(', ')}`
      );
    }

    if (!Array.isArray(args)) {
      throw new ToolError('args must be an array');
    }

    switch (method) {
      case 'goto':
        return await this.executeGoto(args);
      default:
        throw new ToolError(`Method ${method} is not implemented`);
    }
  }
}