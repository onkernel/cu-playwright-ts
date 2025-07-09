import { chromium } from "playwright";
import { z } from "zod";
import { ComputerUseAgent } from "./src/index";

async function textResponseExample(): Promise<void> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://news.ycombinator.com/");

  try {
    console.log("\n=== Text Response Examples ===");
    const agent = new ComputerUseAgent({
      apiKey: ANTHROPIC_API_KEY,
      page,
    });

    // Text response with action
    const topStory = await agent.execute(
      "Tell me the title of the top story on this page"
    );
    console.log("Top story:", topStory);

    // Text response with multiple pieces of information
    const summary = await agent.execute(
      "Give me a brief summary of the top 3 stories"
    );
    console.log("Summary:", summary);
  } catch (error) {
    console.error("Error in text response example:", error);
  } finally {
    await browser.close();
  }
}

async function structuredResponseExample(): Promise<void> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://news.ycombinator.com/");

  try {
    console.log("\n=== Structured Response Examples ===");
    const agent = new ComputerUseAgent({
      apiKey: ANTHROPIC_API_KEY,
      page,
    });

    // Define schema for a single story
    const HackerNewsStory = z.object({
      title: z.string(),
      points: z.number(),
      author: z.string(),
      comments: z.number(),
      url: z.string().optional(),
    });

    // Get multiple stories with structured data
    const stories = await agent.execute(
      "Get the top 5 stories with their titles, points, authors, and comment counts",
      z.array(HackerNewsStory).max(5)
    );
    console.log("Structured stories:", JSON.stringify(stories, null, 2));

    // Define schema for page metadata
    const PageInfo = z.object({
      title: z.string(),
      totalStories: z.number(),
      currentPage: z.number(),
    });

    // Get page information with structured data
    const pageInfo = await agent.execute(
      "Get information about this page including its title, total number of stories visible, and current page number",
      PageInfo
    );
    console.log("Page info:", JSON.stringify(pageInfo, null, 2));
  } catch (error) {
    console.error("Error in structured response example:", error);
  } finally {
    await browser.close();
  }
}

// Run examples
async function runExamples(): Promise<void> {
  console.log("Running Computer Use Agent Examples...");

  await textResponseExample();
  await structuredResponseExample();

  console.log("\nAll examples completed!");
}

runExamples().catch(console.error);
