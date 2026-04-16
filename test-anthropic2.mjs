import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

async function main() {
  try {
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt: 'Hello',
    });
    console.log(result.text);
  } catch(e) {
    console.log("Error:", e.name, e.message);
  }
}
main();
