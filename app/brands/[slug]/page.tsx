import { notFound } from "next/navigation";
import { PageIntro } from "@/components/marketing/page-intro";
import { getBrandProfile, getBusiness } from "@/lib/marketing-data";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ business, dataSource }, profileResult] = await Promise.all([
    getBusiness(slug),
    getBrandProfile(slug),
  ]);

  if (slug !== business.slug) {
    notFound();
  }

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Brand Profile"
        title={business.name}
        description="Brand context, compliance rules, and content pillars live here. The editing workflow can be added later without changing the overall layout."
      />

      {dataSource === "mock" ? (
        <div className="surface rounded-[1.35rem] px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Using fallback brand data until an active `brand_profiles` record exists in Postgres.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="surface rounded-[1.75rem] p-5">
          <h2 className="font-display text-2xl font-semibold">Core positioning</h2>
          <p className="mt-4 text-base leading-8">{business.positioning}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="eyebrow">Audience</p>
              <p className="mt-3 text-sm leading-7">{business.audience}</p>
            </div>
            <div className="rounded-[1.4rem] border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="eyebrow">Tone</p>
              <p className="mt-3 text-sm leading-7">{business.tone}</p>
            </div>
          </div>
        </section>

        <section className="surface rounded-[1.75rem] p-5">
          <h2 className="font-display text-2xl font-semibold">Rules and pillars</h2>
          <div className="mt-5">
            <p className="eyebrow">Compliance rules</p>
            <div className="mt-3 space-y-3">
              {business.complianceRules.map((rule) => (
                <div key={rule} className="rounded-[1.2rem] border p-3 text-sm leading-6" style={{ borderColor: "var(--border)" }}>
                  {rule}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="eyebrow">Content pillars</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {business.contentPillars.map((pillar) => (
                <span key={pillar} className="rounded-full px-3 py-1.5 text-sm" style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-secondary)" }}>
                  {pillar}
                </span>
              ))}
            </div>
          </div>
          {profileResult.profile ? (
            <div className="mt-6 rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="eyebrow">Stored profile JSON</p>
              <pre className="mt-3 overflow-x-auto text-xs leading-6" style={{ color: "var(--text-secondary)" }}>
                {JSON.stringify(profileResult.profile, null, 2)}
              </pre>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
