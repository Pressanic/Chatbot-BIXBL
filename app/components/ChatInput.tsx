/**
 * ChatInput — text input and submit button for the chat interface.
 * @param disabled - True while a streaming response is in progress (driven by useChat isLoading)
 * @param value - Controlled input value from useChat
 * @param onChange - Input change handler from useChat
 * @param onSubmit - Form submit handler from useChat handleSubmit
 */
export function ChatInput({
  disabled,
  value,
  onChange,
  onSubmit,
}: {
  disabled: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-3 p-4 border-t border-[#2a2a2a] bg-[#0f0f0f]"
    >
      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={disabled ? 'Risposta in corso...' : 'Scrivi un messaggio...'}
        className="flex-1 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#f0f0f0] text-sm placeholder:text-[#888] focus:outline-none focus:border-[#6475FA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      />
      <button
        type="submit"
        disabled={disabled || value.trim() === ''}
        className="px-5 py-3 rounded-xl bg-[#6475FA] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5060e0] transition-colors"
      >
        Invia
      </button>
    </form>
  );
}
