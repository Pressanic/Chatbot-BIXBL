import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

async function main() {
  try {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: 'Hello',
    });
    console.log("Success:", result.text);
  } catch(e) {
    console.log("Error type:", Object.getPrototypeOf(e).constructor.name);
    console.log("Error message:", e.message);
  }
}
await main();
