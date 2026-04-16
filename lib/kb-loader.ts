import * as fs from 'fs';
import * as path from 'path';
import type { AgentName } from './types';

/**
 * Reads a single .md file from /knowledge-base/ at runtime.
 * Returns an empty string on any read error — never throws.
 * @param filename - Filename within /knowledge-base/ (e.g. 'shared.md')
 */
async function readKbFile(filename: string): Promise<string> {
  // Guard: read failure returns empty string instead of crashing the route
  try {
    const filePath = path.join(process.cwd(), 'knowledge-base', filename);
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    console.warn(`[kb-loader] Could not read '${filename}':`, err);
    return '';
  }
}

/**
 * Loads the shared Knowledge Base and the agent-specific vertical KB.
 * Both files are read at request time (not build time) so edits to .md
 * files take effect immediately without restarting the dev server (Risk R6).
 * Uses process.cwd() for Vercel serverless runtime compatibility (Risk 2).
 * @param agent - The active agent: 'compass' | 'architect' | 'bridge'
 * @returns { shared, vertical } — both as strings, empty string if file missing
 */
export async function loadKnowledgeBase(
  agent: AgentName,
): Promise<{ shared: string; vertical: string }> {
  const [shared, vertical] = await Promise.all([
    readKbFile('shared.md'),
    readKbFile(`${agent}.md`),
  ]);
  return { shared, vertical };
}
