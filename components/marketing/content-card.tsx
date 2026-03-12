import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowUpRight, Calendar, Flag, FileText, Facebook, Linkedin } from "lucide-react";
import { STATE_COLORS, STATE_LABELS } from "@/lib/state-machine";
import type { ContentItem } from "@/types/content";

const platformIcon = {
  linkedin: Linkedin,
  facebook: Facebook,
  x: FileText,
  blog: FileText,
};

export function ContentCard({ item }: { item: ContentItem }) {
  const PlatformIcon = platformIcon[item.platform];

  return (
    <Link
      href={`/items/${item.id}`}
      className="surface block rounded-[1.4rem] p-4 transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{ background: "rgba(16, 37, 42, 0.06)" }}
          >
            <PlatformIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
              {item.platform}
            </p>
            <p className="text-sm font-semibold">{item.scheduledDate}</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
      </div>

      <div className="mt-4">
        <h3 className="font-display text-lg font-semibold leading-tight">{item.title}</h3>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          {item.currentVersion.excerpt}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Tag icon={Calendar} text={item.campaignTheme} />
        <Tag icon={Flag} text={item.priority} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{
            background: `${STATE_COLORS[item.state]}18`,
            color: STATE_COLORS[item.state],
          }}
        >
          {STATE_LABELS[item.state]}
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {item.currentVersion.label}
        </span>
      </div>
    </Link>
  );
}

function Tag({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
      style={{ background: "rgba(16, 37, 42, 0.05)", color: "var(--text-secondary)" }}
    >
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}
