import { Bot, CheckCheck, HeartPulse, PencilLine, SearchCheck, Siren } from "lucide-react";
import type { ActivityEvent } from "@/types/content";

const iconMap = {
  spawn: Bot,
  heartbeat: HeartPulse,
  draft: PencilLine,
  review: SearchCheck,
  complete: CheckCheck,
  alert: Siren,
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="surface rounded-[1.75rem] p-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow">Live Feed</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Agent activity</h2>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ background: "rgba(168, 63, 53, 0.12)", color: "var(--danger)" }}>
          Live
        </div>
      </div>
      <div className="space-y-4">
        {events.map((event) => {
          const Icon = iconMap[event.kind];

          return (
            <article key={event.id} className="rounded-[1.4rem] border p-4" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.48)" }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "rgba(16, 37, 42, 0.06)" }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{event.timestamp}</p>
                    <span className="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-secondary)" }}>
                      {event.agent}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-medium">{event.summary}</p>
                  <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    {event.detail}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
