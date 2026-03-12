import Link from "next/link";
import { ExternalLink, MessageSquareWarning } from "lucide-react";
import type { ContentItem } from "@/types/content";
import { MarkPostedButton } from "@/components/marketing/mark-posted-button";

export function ApprovalCard({ item }: { item: ContentItem }) {
  return (
    <article className="surface rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ background: "rgba(47, 111, 86, 0.12)", color: "var(--success)" }}>
              {item.platform}
            </span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {item.currentVersion.label}
            </span>
          </div>
          <h3 className="mt-3 font-display text-2xl font-semibold">{item.title}</h3>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Review: {item.review.verdict} ({item.review.confidence} confidence) · CTA: {item.cta}
          </p>
          <p className="mt-4 text-base leading-7">{item.hook}</p>
          {item.reviewerNote ? (
            <div className="mt-4 inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-sm" style={{ background: "rgba(173, 123, 24, 0.12)", color: "var(--warning)" }}>
              <MessageSquareWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {item.reviewerNote}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/items/${item.id}`} className="rounded-full px-4 py-2 text-sm font-medium" style={{ background: "var(--text-primary)", color: "#fff8ef" }}>
            View draft
          </Link>
          {item.platformUrl ? (
            <a href={item.platformUrl} className="rounded-full border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              View on platform <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
            </a>
          ) : null}
          <MarkPostedButton item={item} />
        </div>
      </div>
    </article>
  );
}
