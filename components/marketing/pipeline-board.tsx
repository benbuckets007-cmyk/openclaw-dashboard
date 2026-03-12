"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { buildPipelineColumns } from "@/lib/state-machine";
import { ContentCard } from "@/components/marketing/content-card";
import type { ContentItem, Platform } from "@/types/content";

export function PipelineBoard({ items }: { items: ContentItem[] }) {
  const [platform, setPlatform] = useState<"all" | Platform>("all");
  const columns = buildPipelineColumns(items, platform);

  return (
    <div className="page-grid">
      <div className="surface rounded-[1.75rem] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Pipeline Filters</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Content flow by state</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <Filter className="h-4 w-4" />
              Platform
            </span>
            {(["all", "linkedin", "facebook"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPlatform(value)}
                className="rounded-full px-4 py-2 text-sm font-medium capitalize"
                style={
                  platform === value
                    ? { background: "var(--text-primary)", color: "#fff8ef" }
                    : { background: "rgba(16, 37, 42, 0.05)", color: "var(--text-secondary)" }
                }
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-6">
        {columns.map((column) => (
          <section key={column.state} className="surface rounded-[1.75rem] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{column.label}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {column.items.length} items
                </p>
              </div>
              <div className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(16, 37, 42, 0.06)" }}>
                {column.items.length}
              </div>
            </div>
            <div className="space-y-3">
              {column.items.length ? (
                column.items.map((item) => <ContentCard key={item.id} item={item} />)
              ) : (
                <div className="rounded-[1.4rem] border border-dashed p-6 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  No items in this state.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
