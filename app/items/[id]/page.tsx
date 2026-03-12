import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, ExternalLink, MessageSquareText } from "lucide-react";
import { PageIntro } from "@/components/marketing/page-intro";
import { getContentItemById } from "@/lib/marketing-data";
import { STATE_COLORS, STATE_LABELS } from "@/lib/state-machine";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getContentItemById(id);
  const item = result.data;

  if (!item) {
    notFound();
  }

  return (
    <div className="app-shell page-grid">
      <Link href="/pipeline" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="h-4 w-4" />
        Back to pipeline
      </Link>

      <PageIntro
        eyebrow={`${item.platform} · ${item.currentVersion.label}`}
        title={item.title}
        description={item.brief}
        aside={
          <span
            className="rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em]"
            style={{ background: `${STATE_COLORS[item.state]}18`, color: STATE_COLORS[item.state] }}
          >
            {STATE_LABELS[item.state]}
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="surface rounded-[1.75rem] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-secondary)" }}>
              {item.campaignTheme}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-secondary)" }}>
              {item.priority} priority
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-secondary)" }}>
              Scheduled {item.scheduledDate}
            </span>
          </div>

          <div className="mt-6 rounded-[1.5rem] border p-5" style={{ borderColor: "var(--border)" }}>
            <p className="eyebrow">Hook</p>
            <p className="mt-3 font-display text-2xl font-semibold leading-tight">{item.currentVersion.hook}</p>
            <p className="mt-5 text-base leading-8">{item.currentVersion.excerpt}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>{item.currentVersion.wordCount} words</span>
              <span>CTA: {item.currentVersion.cta}</span>
              {item.draftUrl ? (
                <a href={item.draftUrl} className="font-medium" style={{ color: "var(--accent-strong)" }}>
                  Open draft <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-6">
            <p className="eyebrow">Audit trail</p>
            <div className="mt-3 space-y-3">
              {item.audit.map((entry) => (
                <div key={entry.id} className="rounded-[1.35rem] border p-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{entry.action}</p>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {entry.actor} · {entry.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="surface rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5" />
              <h2 className="font-display text-2xl font-semibold">Latest review</h2>
            </div>
            <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              Verdict: {item.review.verdict} · Confidence: {item.review.confidence}
            </p>
            {item.review.note ? (
              <p className="mt-3 rounded-[1.2rem] px-3 py-3 text-sm leading-6" style={{ background: "rgba(173, 123, 24, 0.12)", color: "var(--warning)" }}>
                {item.review.note}
              </p>
            ) : null}
          </div>

          <div className="surface rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              <h2 className="font-display text-2xl font-semibold">Workflow context</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              <p>Business: NelsonAI</p>
              <p>Platform: {item.platform}</p>
              <p>Reviewer: {item.review.reviewer}</p>
              <p>Last updated: {item.review.createdAt}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
