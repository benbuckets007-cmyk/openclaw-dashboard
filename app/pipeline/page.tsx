import { NotificationBadge } from "@/components/marketing/notification-badge";
import { PageIntro } from "@/components/marketing/page-intro";
import { PipelineBoard } from "@/components/marketing/pipeline-board";
import { getPipelineData } from "@/lib/marketing-data";

export default async function PipelinePage() {
  const { items, metrics, pendingApprovalCount, dataSource } = await getPipelineData();

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Primary View"
        title="Content pipeline"
        description="A working kanban for planned, drafted, reviewed, and approved content. State changes still happen through agents or explicit actions, but this view gives Ben a single operating surface."
        aside={<NotificationBadge count={pendingApprovalCount} label="Items pending approval" />}
      />

      {dataSource === "mock" ? (
        <div className="surface rounded-[1.35rem] px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Rendering fallback demo data because `DATABASE_URL` is missing or the database is unreachable.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="metric-tile">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {metric.label}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="font-display text-3xl font-semibold">{metric.value}</p>
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(47, 111, 86, 0.12)", color: "var(--success)" }}>
                {metric.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <PipelineBoard items={items} />
    </div>
  );
}
