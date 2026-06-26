interface NodeCapabilityBadgeProps {
  reason: string;
}

export function NodeCapabilityBadge({ reason }: NodeCapabilityBadgeProps) {
  return (
    <span
      className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-amber-700 dark:text-amber-300"
      title={reason}
      aria-label={reason}
    >
      unconfig
    </span>
  );
}
