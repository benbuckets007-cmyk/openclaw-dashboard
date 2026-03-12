export function isTelegramWebhookAuthorized(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret) {
    return true;
  }

  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
  return headerSecret === expectedSecret;
}

export function parseTelegramCallbackData(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const [action, contentItemId] = value.split(":");

  if (!action || !contentItemId) {
    return null;
  }

  return { action, contentItemId };
}
