export function NotificationBadge({
  count,
  label,
  compact = false,
}: {
  count: number;
  label: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        aria-label={label}
        className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={{ background: "rgba(208, 103, 50, 0.14)", color: "var(--accent-strong)" }}
      >
        {count}
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ background: "rgba(208, 103, 50, 0.14)", color: "var(--accent-strong)" }}
    >
      {count} pending
    </span>
  );
}
