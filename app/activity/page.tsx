import { ActivityStream } from "@/components/marketing/activity-stream";
import { PageIntro } from "@/components/marketing/page-intro";
import { getActivityEvents } from "@/lib/marketing-data";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ business?: string }>;
}) {
  const params = await searchParams;
  const events = await getActivityEvents(params?.business ?? "nelsonai");

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Gateway Events"
        title="Agent activity"
        description="Recent audit history is shown immediately, and live OpenClaw gateway events stream in when the gateway is connected."
      />
      <ActivityStream initialEvents={events.data} />
    </div>
  );
}
