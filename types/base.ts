export type ActionParams = Record<string, unknown>;

export interface ToolResult {
  output?: string;
  error?: string;
  base64Image?: string;
  system?: string;
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
} 

// Standard function tool definition for custom tools like Playwright
export interface FunctionToolDef {
  name: string;
  type: 'custom';
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: readonly string[];
      items?: { type: string; description: string };
    }>;
    required?: string[];
  };
}

// Computer tool definition (matches Anthropic's built-in computer tool format)
export interface ComputerToolDef {
  name: string;
  type: 'computer_20241022' | 'computer_20250124';
  display_width_px: number;
  display_height_px: number;
  display_number: null;
}

// Union type for all possible tool definitions
export type ComputerUseToolDef = ComputerToolDef | FunctionToolDef;

// Simple base interface for all tools
export interface ComputerUseTool {
  name: string;
  toParams(): ComputerUseToolDef;
  call(params: Record<string, unknown>): Promise<ToolResult>;
}