"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/marketing/activity-feed";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import type { ActivityEvent } from "@/types/content";

const MAX_EVENTS = 40;

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatTimestamp(value: number | Date = Date.now()) {
  return formatter.format(value);
}

function toDetail(payload: unknown) {
  if (payload == null) {
    return "No extra detail recorded.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "Live gateway event received.";
  }
}

function mapGatewayEvent(name: string, payload: unknown): ActivityEvent {
  const base = {
    id: `gateway:${name}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    timestamp: formatTimestamp(),
    agent: "openclaw-gateway",
    business: "OpenClaw",
    detail: toDetail(payload),
  } satisfies Omit<ActivityEvent, "kind" | "summary">;

  switch (name) {
    case "heartbeat":
      return { ...base, kind: "heartbeat", summary: "Gateway heartbeat received" };
    case "health":
      return { ...base, kind: "heartbeat", summary: "Gateway health update" };
    case "cron":
      return { ...base, kind: "complete", summary: "Workflow cron activity" };
    case "agent":
      return { ...base, kind: "spawn", summary: "Agent event received" };
    case "chat":
      return { ...base, kind: "draft", summary: "Live chat activity" };
    case "shutdown":
      return { ...base, kind: "alert", summary: "Gateway shutdown event" };
    case "presence":
      return { ...base, kind: "spawn", summary: "Presence state changed" };
    case "exec.approval.requested":
      return { ...base, kind: "alert", summary: "Execution approval requested" };
    case "exec.approval.resolved":
      return { ...base, kind: "complete", summary: "Execution approval resolved" };
    default:
      return { ...base, kind: "complete", summary: name.replaceAll(".", " ") };
  }
}

export function ActivityStream({ initialEvents }: { initialEvents: ActivityEvent[] }) {
  const { isConnected, state, error, subscribe } = useOpenClaw();
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const eventNames = [
      "agent",
      "chat",
      "presence",
      "health",
      "heartbeat",
      "cron",
      "shutdown",
      "exec.approval.requested",
      "exec.approval.resolved",
    ] as const;

    const unsubscribers = eventNames.map((eventName) =>
      subscribe(eventName, (payload) => {
        setLiveEvents((current) => [mapGatewayEvent(eventName, payload), ...current].slice(0, MAX_EVENTS));
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [subscribe]);

  const mergedEvents = useMemo(
    () => [...liveEvents, ...initialEvents].slice(0, MAX_EVENTS),
    [initialEvents, liveEvents],
  );

  return (
    <ActivityFeed
      events={mergedEvents}
      statusLabel={isConnected ? "Connected" : state}
      statusTone={isConnected ? "success" : error ? "danger" : "neutral"}
    />
  );
}
