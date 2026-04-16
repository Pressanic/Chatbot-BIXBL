/**
 * MessageBubble — renders a single chat message with role-appropriate styling.
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
        {content}
      </div>
    </div>
  );
}
