"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { BusinessProfile } from "@/types/content";

export function BusinessSwitcher() {
  const pathname = usePathname();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadBusinesses() {
      try {
        const response = await fetch("/api/businesses", { cache: "no-store" });
        const payload = await response.json();

        if (!cancelled) {
          setBusinesses(payload.businesses ?? []);
        }
      } catch {
        if (!cancelled) {
          setBusinesses([]);
        }
      }
    }

    void loadBusinesses();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentBusiness = useMemo(() => {
    const slug = pathname?.startsWith("/brands/") ? pathname.split("/")[2] : "nelsonai";
    return businesses.find((business) => business.slug === slug) ?? businesses[0];
  }, [businesses, pathname]);

  return (
    <button
      type="button"
      className="mt-4 flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        color: "#f5efe3",
      }}
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Active business</p>
        <p className="mt-1 text-sm font-semibold">{currentBusiness?.name ?? "NelsonAI"}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-white/70" />
    </button>
  );
}
