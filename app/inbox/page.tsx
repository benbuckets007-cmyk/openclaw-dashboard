import { ApprovalCard } from "@/components/marketing/approval-card";
import { NotificationBadge } from "@/components/marketing/notification-badge";
import { PageIntro } from "@/components/marketing/page-intro";
import { getApprovalItems } from "@/lib/marketing-data";

export default async function InboxPage() {
  const result = await getApprovalItems();
  const items = result.items;

  return (
    <div className="app-shell page-grid">
      <PageIntro
        eyebrow="Approval Queue"
        title="Approval inbox"
        description="A focused list of items that already cleared review and now need human action: open the draft, sanity-check the platform version, and mark the post as posted after publishing."
        aside={<NotificationBadge count={items.length} label="Pending approval items" />}
      />

      {result.dataSource === "mock" ? (
        <div className="surface rounded-[1.35rem] px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Approval actions are backed by live APIs, but the list is using fallback data until Postgres is connected.
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((item) => (
          <ApprovalCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
