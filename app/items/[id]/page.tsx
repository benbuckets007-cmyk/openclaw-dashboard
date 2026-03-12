import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, ExternalLink, GitBranchPlus, MessageSquareText } from "lucide-react";
import { CollectAnalyticsButton } from "@/components/marketing/collect-analytics-button";
import { GenerateImageCandidatesButton } from "@/components/marketing/generate-image-candidates-button";
import { ItemTransitionActions } from "@/components/marketing/item-transition-actions";
import { PageIntro } from "@/components/marketing/page-intro";
import { PublishDraftButton } from "@/components/marketing/publish-draft-button";
import { getContentItemById } from "@/lib/marketing-data";
import { STATE_COLORS, STATE_LABELS } from "@/lib/state-machine";
import { getAvailableTransitions } from "@/lib/marketing-data";

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

  const transitions = getAvailableTransitions(item.state);

  return (
    <div className="app-shell page-grid">
      <Link href="/pipeline" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="h-4 w-4" />
        Back to pipeline
      </Link>

      <PageIntro
        eyebrow={`${item.platform} · ${item.currentVersion.label}`}
        title={item.title}
        description={item.boostCandidate && item.boostReason ? `${item.brief} · ${item.boostReason}` : item.brief}
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

          <div className="mt-6 rounded-[1.5rem] border p-5" style={{ borderColor: "var(--border)" }}>
            <p className="eyebrow">Image direction</p>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              {item.currentVersion.visualNotes ?? "No visual direction captured yet."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {(item.currentVersion.imageCandidates ?? []).map((candidate) => (
                <article key={candidate.id} className="w-full max-w-[18rem] overflow-hidden rounded-[1.2rem] border" style={{ borderColor: "var(--border)" }}>
                  <Image
                    src={candidate.thumbnailUrl ?? candidate.assetUrl}
                    alt={candidate.title}
                    width={720}
                    height={405}
                    unoptimized
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{candidate.title}</p>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        #{candidate.rank}
                      </span>
                    </div>
                    {candidate.caption ? (
                      <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                        {candidate.caption}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      Match score: {candidate.score.toFixed(2)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {item.boostCandidate ? (
            <div className="mt-6 rounded-[1.5rem] border px-5 py-4" style={{ borderColor: "rgba(208, 103, 50, 0.25)", background: "rgba(208, 103, 50, 0.08)" }}>
              <p className="eyebrow">Organic to paid bridge</p>
              <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                Boost candidate flagged. {item.boostReason ?? "This post materially outperformed the business baseline."}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="eyebrow">Versions</p>
            <div className="mt-3 space-y-3">
              {(item.versions ?? [item.currentVersion]).map((version) => (
                <div key={version.id} className="rounded-[1.35rem] border p-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{version.label}</p>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {version.wordCount} words
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    {version.excerpt}
                  </p>
                  {version.altHooks?.length ? (
                    <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      Alt hooks: {version.altHooks.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
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
            {(item.reviews?.length ?? 0) > 1 ? (
              <div className="mt-4 space-y-3">
                {item.reviews?.slice(1).map((review) => (
                  <div key={review.id} className="rounded-[1.2rem] border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
                    {review.createdAt} · {review.verdict} · {review.confidence}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="surface rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              <h2 className="font-display text-2xl font-semibold">Workflow context</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              <p>Business: {item.businessName ?? "NelsonAI"}</p>
              <p>Platform: {item.platform}</p>
              <p>Reviewer: {item.review.reviewer}</p>
              <p>Last updated: {item.review.createdAt}</p>
              <p>Revision cycles: {item.revisionCount ?? 0}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <GenerateImageCandidatesButton itemId={item.id} />
              {item.state === "approved" ? <PublishDraftButton itemId={item.id} /> : null}
              {item.platformUrl || item.platformPostUrl ? <CollectAnalyticsButton itemId={item.id} /> : null}
            </div>
          </div>

          <div className="surface rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2">
              <GitBranchPlus className="h-5 w-5" />
              <h2 className="font-display text-2xl font-semibold">Manual transitions</h2>
            </div>
            <div className="mt-4">
              <ItemTransitionActions itemId={item.id} transitions={transitions} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
