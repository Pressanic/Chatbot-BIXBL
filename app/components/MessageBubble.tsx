'use client';

import ReactMarkdown from 'react-markdown';

/**
 * stripCodeFenceLabel — removes opening code fence labels used as structured output markers.
 * Strips ` ```partners `, ` ```experience `, ` ```profile `, ` ```summary ` labels
 * so ReactMarkdown receives clean content without artifact labels.
 */
function stripCodeFenceLabel(content: string): string {
  return content.replace(/^```(partners|experience|profile|summary)\n?/im, '```\n');
}

/**
 * hasSummaryFence — returns true if content contains a ` ```summary ` block.
 * Used to conditionally show the export download button.
 */
function hasSummaryFence(content: string): boolean {
  return /```summary/i.test(content);
}

/**
 * downloadSummary — extracts text inside ` ```summary ` block and downloads as .md file.
 */
function downloadSummary(content: string): void {
  const match = content.match(/```summary\n?([\s\S]*?)```/i);
  const text = match ? match[1].trim() : content;
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bixbg-summary-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * MessageBubble — renders a single chat message with role-appropriate styling.
 * Assistant messages are rendered with ReactMarkdown + Tailwind typography prose.
 * @param content - The message text content
 * @param role - 'user' or 'assistant' — controls alignment and style
 * @param agentName - Display name shown above assistant messages
 * @param agentColor - Hex color applied as left border accent on assistant messages
 */
export function MessageBubble({
  content,
  role,
  agentName,
  agentColor,
}: {
  content: string;
  role: 'user' | 'assistant';
  agentName?: string;
  agentColor?: string;
}) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-sm bg-[#2a2a2a] text-[#f0f0f0] text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  const cleanContent = stripCodeFenceLabel(content);
  const showDownload = hasSummaryFence(content);

  return (
    <div className="flex justify-start mb-4">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1a1a1a] text-[#f0f0f0] text-sm leading-relaxed border-l-4"
        style={{ borderColor: agentColor ?? '#6475FA' }}
      >
        {agentName && (
          <p
            className="text-xs font-semibold mb-1 opacity-70"
            style={{ color: agentColor ?? '#6475FA' }}
          >
            {agentName}
          </p>
        )}
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-headings:text-[#f0f0f0] prose-a:text-[#6475FA]">
          <ReactMarkdown>{cleanContent}</ReactMarkdown>
        </div>
        {showDownload && (
          <button
            onClick={() => downloadSummary(content)}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#3a3a3a] text-[#aaa] hover:text-[#f0f0f0] hover:border-[#6475FA] transition-colors"
          >
            Scarica .md
          </button>
        )}
      </div>
    </div>
  );
}
