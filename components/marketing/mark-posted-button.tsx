"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ContentItem } from "@/types/content";

export function MarkPostedButton({ item }: { item: ContentItem }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(item.state === "posted");

  async function markPosted() {
    setPending(true);

    try {
      const firstState = item.state === "draft_on_platform" ? "notified" : "posted";
      const firstResponse = await fetch(`/api/content-items/${item.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to_state: firstState,
          actor: "ben",
          details: {
            source: "dashboard",
          },
        }),
      });

      if (!firstResponse.ok) {
        return;
      }

      if (firstState === "posted") {
        setDone(true);
        return;
      }

      const secondResponse = await fetch(`/api/content-items/${item.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to_state: "posted",
          actor: "ben",
          details: {
            source: "dashboard",
          },
        }),
      });

      if (secondResponse.ok) {
        setDone(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void markPosted()}
      disabled={pending || done}
      className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
      style={{ background: "rgba(47, 111, 86, 0.12)", color: "var(--success)" }}
    >
      {pending ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 inline h-4 w-4" />}
      {done ? "Updated" : "Mark posted"}
    </button>
  );
}
