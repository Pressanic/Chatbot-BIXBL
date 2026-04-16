'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, TextUIPart } from 'ai';
import { AgentIndicator } from './AgentIndicator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import type { SavedConversation } from './ConversationSidebar';
import { AGENT_COLORS, AGENT_NAMES } from '@/lib/agents';
import type { AgentName } from '@/lib/types';

interface ActiveAgent {
  agent: AgentName;
  color: string;
  name: string;
}

/** Default agent shown on load before any LLM response arrives. */
const DEFAULT_AGENT: ActiveAgent = {
  agent: 'compass',
  color: AGENT_COLORS.compass,
  name: AGENT_NAMES.compass,
};

const STORAGE_KEY = 'bixbg_conversations';
const MAX_SAVED = 30;

/**
 * getMessageText — extracts plain text from a v6 UIMessage's parts array.
 */
function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  });
}

function loadConversations(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistConversations(convs: SavedConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, MAX_SAVED)));
  } catch {}
}

/**
 * ChatWindow — main chat container. Client component.
 * Includes a collapsible sidebar with conversation history (localStorage).
 * Agent identity is driven exclusively by x-agent response headers (GAP 2 mitigation).
 */
export function ChatWindow() {
  const [currentAgent, setCurrentAgent] = useState<ActiveAgent>(DEFAULT_AGENT);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [viewingConversation, setViewingConversation] = useState<SavedConversation | null>(null);

  const currentAgentRef = useRef<ActiveAgent>(DEFAULT_AGENT);
  currentAgentRef.current = currentAgent;

  // Stable unique ID for this chat session
  const sessionIdRef = useRef<string>(generateId());

  // Load conversation history from localStorage on mount (client only)
  useEffect(() => {
    setSavedConversations(loadConversations());
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ current_agent: currentAgentRef.current.agent }),
        fetch: async (url, init) => {
          const response = await fetch(url as RequestInfo, init as RequestInit);
          const agent = response.headers.get('x-agent') as AgentName | null;
          const color = response.headers.get('x-agent-color');
          const name = response.headers.get('x-agent-name');
          if (agent && color && name) {
            setCurrentAgent({ agent, color, name });
          }
          return response;
        },
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewingConversation]);

  // Auto-save conversation to localStorage whenever messages update
  useEffect(() => {
    if (messages.length === 0) return;

    const storedMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: getMessageText(m),
      }))
      .filter((m) => m.content.trim().length > 0);

    if (storedMessages.length === 0) return;

    const firstUserMsg = storedMessages.find((m) => m.role === 'user');
    const raw = firstUserMsg?.content ?? 'Nuova conversazione';
    const title = raw.length > 60 ? raw.slice(0, 60) + '…' : raw;

    const conv: SavedConversation = {
      id: sessionIdRef.current,
      title,
      date: formatDate(new Date().toISOString()),
      agentName: currentAgentRef.current.name,
      agentColor: currentAgentRef.current.color,
      messageCount: storedMessages.length,
      messages: storedMessages,
    };

    setSavedConversations((prev) => {
      const updated = [conv, ...prev.filter((c) => c.id !== conv.id)];
      persistConversations(updated);
      return updated;
    });
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage({ text });
  };

  const handleNewChat = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Collapsible sidebar */}
      {sidebarOpen && (
        <ConversationSidebar
          conversations={savedConversations}
          viewingId={viewingConversation?.id ?? null}
          onSelect={setViewingConversation}
          onNewChat={handleNewChat}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] bg-[#0f0f0f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="p-1.5 rounded-lg text-[#555] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect y="2" width="16" height="1.5" rx="0.75" />
                <rect y="7.25" width="16" height="1.5" rx="0.75" />
                <rect y="12.5" width="16" height="1.5" rx="0.75" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-[#f0f0f0]">BIXBG Chatbot</h1>
          </div>

          <div className="flex items-center gap-3">
            {viewingConversation && (
              <button
                onClick={() => setViewingConversation(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] text-[#888] hover:text-[#f0f0f0] hover:bg-[#2a2a2a] transition-colors"
              >
                ← Chat attiva
              </button>
            )}
            <AgentIndicator
              agentName={viewingConversation?.agentName ?? currentAgent.name}
              agentColor={viewingConversation?.agentColor ?? currentAgent.color}
            />
          </div>
        </div>

        {/* History mode banner */}
        {viewingConversation && (
          <div className="px-5 py-2 bg-[#111] border-b border-[#1e1e1e] flex items-center gap-2 text-xs text-[#555] flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#444] inline-block flex-shrink-0" />
            Stai visualizzando una conversazione precedente — usa ← Chat attiva per tornare
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6">
            {/* Welcome message */}
            {messages.length === 0 && !viewingConversation && (
              <MessageBubble
                role="assistant"
                content="Ciao Matteo. Dimmi dell'idea che hai in testa — anche se è ancora vaga, partiamo da lì."
                agentName={DEFAULT_AGENT.name}
                agentColor={DEFAULT_AGENT.color}
              />
            )}

            {/* Historical conversation */}
            {viewingConversation &&
              viewingConversation.messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  agentName={msg.role === 'assistant' ? viewingConversation.agentName : undefined}
                  agentColor={msg.role === 'assistant' ? viewingConversation.agentColor : undefined}
                />
              ))}

            {/* Live conversation */}
            {!viewingConversation &&
              messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role as 'user' | 'assistant'}
                    content={getMessageText(msg)}
                    agentName={msg.role === 'assistant' ? currentAgent.name : undefined}
                    agentColor={msg.role === 'assistant' ? currentAgent.color : undefined}
                  />
                ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input — hidden while viewing history */}
        {!viewingConversation && (
          <div className="flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                disabled={isLoading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
