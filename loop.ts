import { Anthropic } from '@anthropic-ai/sdk';
import { DateTime } from 'luxon';
import type { Page } from 'playwright';
import type { BetaMessageParam, BetaTextBlock } from './types/beta';
import { ComputerUseToolCollection, DEFAULT_TOOL_VERSION, TOOL_GROUPS_BY_VERSION, type ToolVersion } from './tools/collection';
import { responseToParams, maybeFilterToNMostRecentImages, injectPromptCaching, PROMPT_CACHING_BETA_FLAG } from './utils/message-processing';
import { makeApiToolResult } from './utils/tool-results';
import { ComputerTool20241022, ComputerTool20250124 } from './tools/computer';
import { Action } from './tools/types/computer';
import { PlaywrightTool } from './tools/playwright';

// System prompt optimized for the environment
const SYSTEM_PROMPT = `<SYSTEM_CAPABILITY>
* You are utilising an Ubuntu virtual machine using ${process.arch} architecture with internet access.
* When you connect to the display, CHROMIUM IS ALREADY OPEN. The url bar is not visible but it is there.
* If you need to navigate to a new page, use the "goto" tool provided.
* When viewing a page it can be helpful to zoom out so that you can see everything on the page.
* Either that, or make sure you scroll down to see everything before deciding something isn't available.
* When using your computer function calls, they take a while to run and send back to you.
* Where possible/feasible, try to chain multiple of these calls all into one function calls request.
* The current date is ${DateTime.now().toFormat('EEEE, MMMM d, yyyy')}.
* After each step, take a screenshot and carefully evaluate if you have achieved the right outcome.
* Explicitly show your thinking: "I have evaluated step X..." If not correct, try again.
* Only when you confirm a step was executed correctly should you move on to the next one.
</SYSTEM_CAPABILITY>

<IMPORTANT>
* When using Chromium, if a startup wizard appears, IGNORE IT. Do not even click "skip this step".
* For ALL navigation needs, use the "goto" method - never use keyboard shortcuts or URL bar interactions.
* The goto method is the reliable way to navigate to any website or URL.
* If no specific URL is provided to achieve a goal or part of a goal, use Google (https://www.google.com) as your entry point to search for and navigate to relevant websites.
* For ambiguous requests, use Google to find the most relevant site.
</IMPORTANT>`;

// Add new type definitions
interface ThinkingConfig {
  type: 'enabled';
  budget_tokens: number;
}

interface ExtraBodyConfig {
  thinking?: ThinkingConfig;
}

interface ToolUseInput extends Record<string, unknown> {
  action?: Action;
  method?: string;
  args?: string[];
}

export async function samplingLoop({
  model,
  systemPromptSuffix,
  messages,
  apiKey,
  onlyNMostRecentImages,
  maxTokens = 4096,
  toolVersion,
  thinkingBudget,
  tokenEfficientToolsBeta = false,
  playwrightPage,
}: {
  model: string;
  systemPromptSuffix?: string;
  messages: BetaMessageParam[];
  apiKey: string;
  onlyNMostRecentImages?: number;
  maxTokens?: number;
  toolVersion?: ToolVersion;
  thinkingBudget?: number;
  tokenEfficientToolsBeta?: boolean;
  playwrightPage: Page;
}): Promise<BetaMessageParam[]> {
  const selectedVersion = toolVersion || DEFAULT_TOOL_VERSION;
  const toolGroup = TOOL_GROUPS_BY_VERSION[selectedVersion];
  
  // Create computer tools
  const computerTools = toolGroup.tools.map((Tool: typeof ComputerTool20241022 | typeof ComputerTool20250124) => new Tool(playwrightPage));

  // Create playwright tool
  const playwrightTool = new PlaywrightTool(playwrightPage);
  
  const toolCollection = new ComputerUseToolCollection(...computerTools, playwrightTool);
  
  const system: BetaTextBlock = {
    type: 'text',
    text: `${SYSTEM_PROMPT}${systemPromptSuffix ? ' ' + systemPromptSuffix : ''}`,
  };

  while (true) {
    const betas: string[] = toolGroup.beta_flag ? [toolGroup.beta_flag] : [];
    
    if (tokenEfficientToolsBeta) {
      betas.push('token-efficient-tools-2025-02-19');
    }

    let imageTruncationThreshold = onlyNMostRecentImages || 0;

    const client = new Anthropic({ apiKey, maxRetries: 4 });
    const enablePromptCaching = true;
    
    if (enablePromptCaching) {
      betas.push(PROMPT_CACHING_BETA_FLAG);
      injectPromptCaching(messages);
      onlyNMostRecentImages = 0;
      (system as BetaTextBlock).cache_control = { type: 'ephemeral' };
    }

    if (onlyNMostRecentImages) {
      maybeFilterToNMostRecentImages(
        messages,
        onlyNMostRecentImages,
        imageTruncationThreshold
      );
    }

    const extraBody: ExtraBodyConfig = {};
    if (thinkingBudget) {
      extraBody.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    }

    const toolParams = toolCollection.toParams();

    const response = await client.beta.messages.create({
      max_tokens: maxTokens,
      messages,
      model,
      system: [system],
      tools: toolParams,
      betas,
      ...extraBody,
    });

    const responseParams = responseToParams(response);
    
    const loggableContent = responseParams.map(block => {
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          name: block.name,
          input: block.input
        };
      }
      return block;
    });
    console.log('=== LLM RESPONSE ===');
    console.log('Stop reason:', response.stop_reason);
    console.log(loggableContent);
    console.log("===")
    
    messages.push({
      role: 'assistant',
      content: responseParams,
    });

    if (response.stop_reason === 'end_turn') {
      console.log('LLM has completed its task, ending loop');
      return messages;
    }

    const toolResultContent = [];
    let hasToolUse = false;
    
    for (const contentBlock of responseParams) {
      if (contentBlock.type === 'tool_use' && contentBlock.name && contentBlock.input && typeof contentBlock.input === 'object') {
        const input = contentBlock.input as ToolUseInput;
        hasToolUse = true;

        try {
          const result = await toolCollection.run(
            contentBlock.name,
            input
          );

          const toolResult = makeApiToolResult(result, contentBlock.id!);
          toolResultContent.push(toolResult);
        } catch (error) {
          console.error(error);
          throw error;
        }
      }

      if (toolResultContent.length === 0 && !hasToolUse && response.stop_reason !== 'tool_use') {
        console.log('No tool use or results, and not waiting for tool use, ending loop');
        return messages;
      }

      if (toolResultContent.length > 0) {
        messages.push({
          role: 'user',
          content: toolResultContent,
        });
      }
    }
  }
}

/**
 * Simplified computer use loop for executing tasks with Claude
 * 
 * This function provides a higher-level interface to the sampling loop,
 * accepting a simple query string instead of message arrays.
 * 
 * @param options - Configuration options
 * @param options.query - The task description for Claude to execute
 * @param options.apiKey - Anthropic API key for authentication
 * @param options.playwrightPage - Playwright page instance to control
 * @param options.model - Anthropic model to use (default: claude-sonnet-4-20250514)
 * @param options.systemPromptSuffix - Additional instructions appended to system prompt
 * @param options.maxTokens - Maximum tokens for response (default: 4096)
 * @param options.toolVersion - Computer use tool version (auto-selected based on model)
 * @param options.thinkingBudget - Token budget for Claude's reasoning (default: 1024)
 * @param options.tokenEfficientToolsBeta - Enable token-efficient tools beta
 * @param options.onlyNMostRecentImages - Limit number of recent images to include
 * 
 * @returns Promise resolving to array of conversation messages
 * 
 * @see https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/computer-use-tool
 * @see https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
 */
export async function computerUseLoop({
  query,
  apiKey,
  playwrightPage,
  model = 'claude-sonnet-4-20250514',
  systemPromptSuffix,
  maxTokens = 4096,
  toolVersion,
  thinkingBudget = 1024,
  tokenEfficientToolsBeta = false,
  onlyNMostRecentImages,
}: {
  query: string;
  apiKey: string;
  playwrightPage: Page;
  model?: string;
  systemPromptSuffix?: string;
  maxTokens?: number;
  toolVersion?: ToolVersion;
  thinkingBudget?: number;
  tokenEfficientToolsBeta?: boolean;
  onlyNMostRecentImages?: number;
}): Promise<BetaMessageParam[]> {
  return samplingLoop({
    model,
    systemPromptSuffix,
    messages: [{
      role: 'user',
      content: query,
    }],
    apiKey,
    maxTokens,
    toolVersion,
    thinkingBudget,
    tokenEfficientToolsBeta,
    onlyNMostRecentImages,
    playwrightPage,
  });
}
