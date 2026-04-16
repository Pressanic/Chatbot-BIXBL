'use client';

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SavedConversation {
  id: string;
  title: string;
  date: string;
  agentName: string;
  agentColor: string;
  messageCount: number;
  messages: StoredMessage[];
}

interface ConversationSidebarProps {
  conversations: SavedConversation[];
  viewingId: string | null;
  onSelect: (conv: SavedConversation) => void;
  onNewChat: () => void;
}

export function ConversationSidebar({
  conversations,
  viewingId,
  onSelect,
  onNewChat,
}: ConversationSidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 bg-[#090909] border-r border-[#1e1e1e] flex flex-col h-screen overflow-hidden">
      {/* New chat button */}
      <div className="px-3 py-4 border-b border-[#1e1e1e]">
        <button
          onClick={onNewChat}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-[#6475FA]/10 text-[#6475FA] border border-[#6475FA]/20 hover:bg-[#6475FA]/20 transition-colors"
        >
          + Nuova chat
        </button>
      </div>

      {/* Section label */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] uppercase tracking-widest text-[#333] font-semibold">
          Cronologia
        </p>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-xs text-[#333] text-center leading-relaxed">
            Le conversazioni
            <br />
            appariranno qui
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full px-3 py-2.5 text-left rounded-lg transition-colors ${
                viewingId === conv.id ? 'bg-[#181818]' : 'hover:bg-[#111]'
              }`}
            >
              <p className="text-xs text-[#d0d0d0] truncate leading-snug font-medium">
                {conv.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-[10px] font-medium truncate max-w-[80px]"
                  style={{ color: conv.agentColor }}
                >
                  {conv.agentName}
                </span>
                <span className="text-[#222]">·</span>
                <span className="text-[10px] text-[#333]">{conv.date}</span>
                <span className="text-[#222]">·</span>
                <span className="text-[10px] text-[#333]">{conv.messageCount}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
