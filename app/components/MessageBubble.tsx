'use client';

import ReactMarkdown from 'react-markdown';

/**
 * stripCodeFenceLabel — removes opening code fence labels used as structured output markers.
 * Strips ```partners, ```experience, ```profile labels so ReactMarkdown receives clean content.
 * Summary fences are handled separately as an inline card.
 */
function stripCodeFenceLabel(content: string): string {
  return content.replace(/^```(partners|experience|profile)\n?/im, '```\n');
}

/**
 * extractSummaryContent — returns the text inside a ```summary block, or null if absent.
 */
function extractSummaryContent(content: string): string | null {
  const match = content.match(/```summary\n?([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

/**
 * removeSummaryBlock — strips the full ```summary...``` block from content.
 * Used so the summary is not also rendered as a raw code block in the main prose.
 */
function removeSummaryBlock(content: string): string {
  return content.replace(/```summary[\s\S]*?```/i, '').trim();
}

/**
 * MessageBubble — renders a single chat message.
 * Assistant messages use ReactMarkdown + Tailwind typography.
 * When a ```summary block is present it is rendered as an inline schematic card,
 * not downloaded as a file.
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

  const summaryContent = extractSummaryContent(content);
  const contentForRendering = summaryContent ? removeSummaryBlock(content) : content;
  const cleanContent = stripCodeFenceLabel(contentForRendering);
  const accent = agentColor ?? '#6475FA';

  return (
    <div className="flex justify-start mb-4">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1a1a1a] text-[#f0f0f0] text-sm leading-relaxed border-l-4"
        style={{ borderColor: accent }}
      >
        {agentName && (
          <p className="text-xs font-semibold mb-1 opacity-70" style={{ color: accent }}>
            {agentName}
          </p>
        )}

        {/* Main prose content */}
        {cleanContent && (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-headings:text-[#f0f0f0] prose-a:text-[#6475FA]">
            <ReactMarkdown>{cleanContent}</ReactMarkdown>
          </div>
        )}

        {/* Inline summary card — replaces the old "Scarica .md" download button */}
        {summaryContent && (
          <div className="mt-3 rounded-xl overflow-hidden border border-[#2a2a2a]">
            {/* Card header */}
            <div
              className="px-4 py-2 border-b border-[#2a2a2a] flex items-center gap-2"
              style={{ backgroundColor: `${accent}14` }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill={accent}
                className="flex-shrink-0 opacity-80"
              >
                <rect x="0" y="0" width="5" height="1.5" rx="0.75" />
                <rect x="0" y="3.5" width="12" height="1.5" rx="0.75" />
                <rect x="0" y="7" width="9" height="1.5" rx="0.75" />
                <rect x="0" y="10.5" width="7" height="1.5" rx="0.75" />
              </svg>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: accent }}
              >
                Riepilogo
              </p>
            </div>

            {/* Card body — summary rendered as styled markdown */}
            <div
              className="px-4 py-3 bg-[#111]"
              style={
                {
                  '--tw-prose-body': '#c0c0c0',
                  '--tw-prose-headings': '#e8e8e8',
                  '--tw-prose-bold': '#e8e8e8',
                } as React.CSSProperties
              }
            >
              <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-[#e8e8e8] [&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:leading-snug [&_h2]:text-[10px] [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:text-[#555] [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-4 [&_h2]:first:mt-0 [&_p]:my-1 [&_p]:text-[#b0b0b0] [&_p]:text-xs [&_li]:text-[#b0b0b0] [&_li]:text-xs [&_li]:my-0.5 [&_strong]:text-[#e0e0e0] [&_ul]:pl-4 [&_ol]:pl-4">
                <ReactMarkdown>{summaryContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
