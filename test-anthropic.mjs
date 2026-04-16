import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

async function main() {
  try {
    const anthropic = createAnthropic();
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: 'Hello',
    });
    console.log(result.text);
  } catch(e) {
    console.log("Full error:", Object.keys(e));
    console.log("Name:", e.name);
    console.log("Message:", e.message);
  }
}
main();
