import { chromium } from 'playwright';
import { samplingLoop } from './index';

// Example usage of the Computer Use Playwright SDK
async function example(): Promise<void> {
  // Your Anthropic API key
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  
  // Launch a browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto("https://news.ycombinator.com/newest");

  try {
    // Use the samplingLoop to have the AI perform a task
    const messages = await samplingLoop({
      model: 'claude-sonnet-4-20250514',
      messages: [{
        role: 'user',
        content: 'Get the top 5 posts on hackernews homepage'
      }],
      apiKey: ANTHROPIC_API_KEY,
      thinkingBudget: 1024,
      playwrightPage: page,
    });
    
    console.log('Task completed!');
    console.log('Final messages:', messages.length);
    
    // Extract the final assistant response
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      console.log('Final response:', lastMessage.content);
    }
    
  } catch (error) {
    console.error('Error during task execution:', error);
  } finally {
    await browser.close();
  }
}

example().catch(console.error); 