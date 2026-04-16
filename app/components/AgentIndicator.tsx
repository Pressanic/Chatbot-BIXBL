/**
 * AgentIndicator — displays the currently active agent's name and color as a badge.
 * @param agentName - Display name of the active agent (e.g. "BIXBG Compass")
 * @param agentColor - Hex color string for the agent (e.g. "#6475FA")
 */
export function AgentIndicator({
  agentName,
  agentColor,
}: {
  agentName: string;
  agentColor: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
      style={{ backgroundColor: agentColor }}
    >
      <span className="w-2 h-2 rounded-full bg-white opacity-80" />
      {agentName}
    </div>
  );
}
