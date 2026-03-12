#!/usr/bin/env node
const { Pool } = require('pg');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[key.slice(2)] = value;
  }
  return out;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function keyboard(itemId, draftUrl, dashboardUrl) {
  return {
    inline_keyboard: [
      [
        ...(draftUrl ? [{ text: 'View Draft ↗', url: draftUrl }] : []),
        ...(dashboardUrl ? [{ text: 'Open Dashboard ↗', url: dashboardUrl }] : []),
      ],
      [{ text: '✅ Mark Posted', callback_data: `mark_posted:${itemId}` }],
    ],
  };
}

function renderMessage(eventType, payload) {
  if (eventType === 'draft_ready') {
    return `🟢 ${payload.business_name} — ${payload.platform_label} draft ready\n━━━━━━━━━━━━━━━━━━━━━\nHook: ${payload.headline || 'N/A'}\nReview: ✅ Passed${payload.confidence ? ` (confidence: ${payload.confidence})` : ''}\nCTA: ${payload.cta || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━━\n📎 Draft: ${payload.platform_draft_url || 'N/A'}\n📋 Dashboard: ${payload.dashboard_url || 'N/A'}`;
  }
  if (eventType === 'revision_required') {
    return `🟡 ${payload.business_name} — ${payload.platform_label} draft needs revision\n━━━━━━━━━━━━━━━━━━━━━\nIssue: ${payload.revision_notes || 'Revision requested'}\nFlags: ${(payload.risk_flags || []).join(', ') || 'None'}\nAttempt: ${payload.version_number || '?'} / 2\n━━━━━━━━━━━━━━━━━━━━━\n📋 Dashboard: ${payload.dashboard_url || 'N/A'}`;
  }
  if (eventType === 'weekly_plan_ready') {
    return `📅 ${payload.business_name} — Weekly plan ready\n━━━━━━━━━━━━━━━━━━━━━\nReview the new content items for this week in the dashboard.\n📋 Dashboard: ${payload.dashboard_url || 'N/A'}`;
  }
  if (eventType === 'weekly_summary') {
    return `📊 ${payload.business_name} — Weekly Analytics Summary\n━━━━━━━━━━━━━━━━━━━━━\nPosts this week: ${payload.count || 0}\nBest: ${payload.top_post_hook || 'N/A'}\nWorst: ${payload.bottom_post_hook || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━━\nRecommendation: ${payload.ai_recommendation || 'Review trends in dashboard'}\n📋 Dashboard: ${payload.dashboard_url || 'N/A'}`;
  }
  if (eventType === 'stale_item_alert') {
    return `🔴 Stale items need attention\n━━━━━━━━━━━━━━━━━━━━━\n${payload.count || 0} items stuck for >24h\n${payload.item_list || ''}\n━━━━━━━━━━━━━━━━━━━━━\n📋 Dashboard: ${payload.dashboard_url || 'N/A'}`;
  }
  if (eventType === 'boost_candidate') {
    return `🚀 ${payload.business_name} — Boost candidate detected\n━━━━━━━━━━━━━━━━━━━━━\nPost: ${payload.headline || 'N/A'} (${payload.platform_label || 'Platform'})\nEngagement: ${payload.engagement_rate || 'N/A'} (${payload.multiplier || 'N/A'}x avg)\n━━━━━━━━━━━━━━━━━━━━━\n📋 Dashboard: ${payload.dashboard_url || 'N/A'}`;
  }
  return `⚠️ ${payload.business_name || 'Marketing Ops'} — ${eventType}\n${payload.message || 'No details provided.'}`;
}

async function loadPayload(pool, args, dashboardBaseUrl) {
  const eventType = args['event-type'] || args.event_type;
  const contentItemId = args['content-item-id'] || null;
  const businessId = args['business-id'] || null;

  if (args.payload) {
    const payload = JSON.parse(args.payload);
    return { eventType, contentItemId, businessId, payload };
  }

  if (eventType === 'draft_ready' || eventType === 'revision_required') {
    if (!contentItemId) throw new Error(`${eventType} requires --content-item-id or --payload`);
    const { rows } = await pool.query(
      `SELECT ci.id, ci.platform, ci.platform_draft_url, ci.business_id, b.name AS business_name,
              cv.headline, ci.brief, rr.confidence, rr.revision_notes, rr.risk_flags, cv.version_number
         FROM content_items ci
         JOIN businesses b ON b.id = ci.business_id
         LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
         LEFT JOIN LATERAL (
           SELECT * FROM review_records WHERE content_item_id = ci.id ORDER BY created_at DESC LIMIT 1
         ) rr ON true
        WHERE ci.id = $1
        LIMIT 1`,
      [contentItemId],
    );
    const row = rows[0];
    if (!row) throw new Error(`Content item not found: ${contentItemId}`);
    const brief = row.brief || {};
    return {
      eventType,
      contentItemId,
      businessId: row.business_id,
      payload: {
        business_name: row.business_name,
        platform_label: row.platform[0].toUpperCase() + row.platform.slice(1),
        headline: row.headline,
        confidence: row.confidence,
        cta: brief.cta || null,
        platform_draft_url: row.platform_draft_url,
        revision_notes: row.revision_notes,
        risk_flags: row.risk_flags || [],
        version_number: row.version_number,
        dashboard_url: `${dashboardBaseUrl}/items/${contentItemId}`,
      },
    };
  }

  if (eventType === 'weekly_plan_ready') {
    if (!businessId) throw new Error('weekly_plan_ready requires --business-id');
    const { rows } = await pool.query('SELECT id, name FROM businesses WHERE id = $1 LIMIT 1', [businessId]);
    if (!rows[0]) throw new Error(`Business not found: ${businessId}`);
    return {
      eventType,
      contentItemId: null,
      businessId,
      payload: {
        business_name: rows[0].name,
        dashboard_url: `${dashboardBaseUrl}/pipeline`,
      },
    };
  }

  if (eventType === 'boost_candidate') {
    if (!contentItemId) throw new Error('boost_candidate requires --content-item-id or --payload');
    const { rows } = await pool.query(
      `SELECT ci.id, ci.platform, ci.business_id, b.name AS business_name, cv.headline
         FROM content_items ci
         JOIN businesses b ON b.id = ci.business_id
         LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
        WHERE ci.id = $1
        LIMIT 1`,
      [contentItemId],
    );
    const row = rows[0];
    if (!row) throw new Error(`Content item not found: ${contentItemId}`);
    return {
      eventType,
      contentItemId,
      businessId: row.business_id,
      payload: {
        business_name: row.business_name,
        platform_label: row.platform[0].toUpperCase() + row.platform.slice(1),
        headline: row.headline,
        engagement_rate: 'N/A',
        multiplier: 'N/A',
        dashboard_url: `${dashboardBaseUrl}/items/${contentItemId}`,
      },
    };
  }

  return {
    eventType,
    contentItemId,
    businessId,
    payload: {
      business_name: 'Marketing Ops',
      dashboard_url: `${dashboardBaseUrl}/pipeline`,
      message: 'Event notification',
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if ((args.action || 'send') !== 'send') throw new Error('Only --action send is supported');
  requiredEnv('DATABASE_URL');
  const botToken = requiredEnv('TELEGRAM_BOT_TOKEN');
  const chatId = requiredEnv('TELEGRAM_CHAT_ID');
  const dashboardBaseUrl = requiredEnv('DASHBOARD_URL').replace(/\/$/, '');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const loaded = await loadPayload(pool, args, dashboardBaseUrl);
    const text = renderMessage(loaded.eventType, loaded.payload);
    const replyMarkup = loaded.contentItemId
      ? keyboard(loaded.contentItemId, loaded.payload.platform_draft_url, loaded.payload.dashboard_url)
      : undefined;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    });

    const responseJson = await response.json().catch(() => ({}));
    if (!response.ok || responseJson.ok === false) {
      throw new Error(`Telegram API error: ${response.status} ${JSON.stringify(responseJson)}`);
    }

    await pool.query(
      `INSERT INTO notification_events (content_item_id, business_id, channel, event_type, payload, sent_at, delivered)
       VALUES ($1, $2, 'telegram', $3, $4::jsonb, now(), true)`,
      [loaded.contentItemId, loaded.businessId, loaded.eventType, JSON.stringify(loaded.payload)],
    );

    if (loaded.businessId) {
      await pool.query(
        `INSERT INTO audit_events (business_id, content_item_id, actor, action, details)
         VALUES ($1, $2, 'telegram-notifier', 'notification_sent', $3::jsonb)`,
        [loaded.businessId, loaded.contentItemId, JSON.stringify({ event_type: loaded.eventType })],
      );
    }

    console.log(JSON.stringify({ ok: true, event_type: loaded.eventType, telegram: responseJson.result || responseJson }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
