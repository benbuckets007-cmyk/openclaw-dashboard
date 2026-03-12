"use client";

import { Activity, Cpu, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { useOpenClaw } from "@/contexts/OpenClawContext";

const tiles = [
  { label: "Gateway", icon: Activity, value: "Ready for RPC", note: "Typed WebSocket integration retained from upstream." },
  { label: "Models", icon: Cpu, value: "Catalog available", note: "Keep existing model and agent management flows." },
  { label: "Channels", icon: Radio, value: "Channel-aware", note: "Skills and channels stay available for ops use." },
  { label: "Safety", icon: ShieldCheck, value: "Draft-only", note: "No autonomous publishing in the marketing workflow." },
];

export default function OverviewPage() {
  const { isConnected, state } = useOpenClaw();

  return (
    <div className="app-shell page-grid">
      <div className="surface rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">OpenClaw Ops</p>
            <h1 className="mt-3 font-display text-4xl font-semibold">Gateway overview</h1>
            <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--text-secondary)" }}>
              The original dashboard’s operational surface is still present. This page is now the admin starting point instead of the main landing page.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: isConnected ? "rgba(47, 111, 86, 0.12)" : "rgba(168, 63, 53, 0.12)",
              color: isConnected ? "var(--success)" : "var(--danger)",
            }}
          >
            {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {state}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;

          return (
            <div key={tile.label} className="metric-tile">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {tile.label}
                </p>
              </div>
              <p className="mt-4 font-display text-2xl font-semibold">{tile.value}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                {tile.note}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
