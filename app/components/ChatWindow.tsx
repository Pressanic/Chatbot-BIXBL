'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, TextUIPart } from 'ai';
import { AgentIndicator } from './AgentIndicator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
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

/**
 * getMessageText — extracts plain text from a v6 UIMessage's parts array.
 * Only text parts are included; tool calls, reasoning, and other parts are ignored.
 */
function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/**
 * ChatWindow — main chat container. Client component.
 * Uses useChat (AI SDK v6) for streaming and message history.
 * Agent identity is driven exclusively by x-agent response headers (GAP 2 mitigation).
 * Headers are captured via a custom fetch wrapper in DefaultChatTransport.
 * History resets on page reload — no persistence (by design, per Anti-Goals).
 */
export function ChatWindow() {
  // GAP 2 mitigation: agent state is derived from headers, never hardcoded
  const [currentAgent, setCurrentAgent] = useState<ActiveAgent>(DEFAULT_AGENT);

  // Input state is managed manually in AI SDK v6 (not included in useChat)
  const [input, setInput] = useState('');

  // Ref keeps the latest agent available inside the transport's body resolver
  const currentAgentRef = useRef<ActiveAgent>(DEFAULT_AGENT);
  currentAgentRef.current = currentAgent;

  // Transport is memoized so it is not recreated on every render.
  // Custom fetch wrapper captures x-agent headers before the stream body is consumed.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        // Passes current_agent to the route on every request (Resolvable — called per request)
        body: () => ({ current_agent: currentAgentRef.current.agent }),
        // GAP 2 mitigation: intercept response to read agent identity headers
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

  // useRef used here for DOM access only — not for state storage (IDE Rules exception)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth-scroll to the bottom anchor whenever the message list updates
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI SDK v6 uses `status` instead of `isLoading`
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header with dynamic agent badge */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0f0f0f]">
        <h1 className="text-lg font-semibold text-[#f0f0f0]">BIXBG Chatbot</h1>
        <AgentIndicator agentName={currentAgent.name} agentColor={currentAgent.color} />
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Welcome message shown before any conversation starts */}
        {messages.length === 0 && (
          <MessageBubble
            role="assistant"
            content="Ciao Matteo. Dimmi dell'idea che hai in testa — anche se è ancora vaga, partiamo da lì."
            agentName={DEFAULT_AGENT.name}
            agentColor={DEFAULT_AGENT.color}
          />
        )}
        {messages
          .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as 'user' | 'assistant'}
              content={getMessageText(msg)}
              agentName={msg.role === 'assistant' ? currentAgent.name : undefined}
              agentColor={msg.role === 'assistant' ? currentAgent.color : undefined}
            />
          ))}
        {/* Scroll anchor — scrollIntoView target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — isLoading drives the disabled state dynamically */}
      <ChatInput
        disabled={isLoading}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
