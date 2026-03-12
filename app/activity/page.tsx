import { ActivityFeed } from "@/components/marketing/activity-feed";
import { PageIntro } from "@/components/marketing/page-intro";
import { getActivityEvents } from "@/lib/marketing-data";

export default async function ActivityPage() {
  const events = await getActivityEvents();

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Gateway Events"
        title="Agent activity"
        description="Recent activity from audit events and workflow actions. OpenClaw event streaming can layer on top of this without changing the page contract."
      />
      <ActivityFeed events={events.data} />
    </div>
  );
}
