import { BarChart3, TrendingUp } from "lucide-react";
import { PageIntro } from "@/components/marketing/page-intro";
import { getAnalyticsMetrics, getContentItems } from "@/lib/marketing-data";

export default async function AnalyticsPage() {
  const [metrics, items] = await Promise.all([getAnalyticsMetrics(), getContentItems()]);

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Phase 2 View"
        title="Analytics dashboard"
        description="Weekly reach, click-through, and review quality are surfaced here so the planning loop can evolve from raw activity into compounding signal."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.data.map((metric) => (
          <div key={metric.label} className="metric-tile">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {metric.label}
            </p>
            <p className="mt-3 font-display text-3xl font-semibold">{metric.value}</p>
            <p className="mt-2 text-sm" style={{ color: "var(--success)" }}>
              {metric.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface rounded-[1.75rem] p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <h2 className="font-display text-2xl font-semibold">Performance by topic</h2>
          </div>
          <div className="mt-6 space-y-4">
            {[
              ["Leadership readiness", 82],
              ["Workflow friction", 69],
              ["Risk and governance", 64],
              ["Case-study style proof", 57],
            ].map(([label, score]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{score}% engagement score</span>
                </div>
                <div className="h-3 rounded-full" style={{ background: "rgba(16, 37, 42, 0.08)" }}>
                  <div className="h-3 rounded-full" style={{ width: `${score}%`, background: "linear-gradient(90deg, #d06732, #2f6f56)" }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface rounded-[1.75rem] p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h2 className="font-display text-2xl font-semibold">Next planning inputs</h2>
          </div>
          <div className="mt-5 space-y-3">
            {items.data.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[1.3rem] border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  {item.platform}
                </p>
                <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  Theme: {item.campaignTheme}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
