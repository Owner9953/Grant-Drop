"use node";

/**
 * Outbound email via MailerSend.
 *
 * Runs on the Node runtime so it can read `MAILERSEND_API_KEY` from the
 * environment. The digest HTML is built here rather than in a dashboard
 * template, so the whole message is version-controlled alongside the app and
 * there's no template ID to keep in sync.
 *
 * The API key is optional: without it the sender reports `configured: false`
 * and the digest records a skip instead of throwing, so the rest of the
 * notification system stays usable before keys are added.
 */

import type { Giveaway } from "../lib/giveaways";
import { action } from "./_generated/server";
import { v } from "convex/values";

const API_URL = "https://api.mailersend.com/v1/email";
const FROM_EMAIL = "Grantdrop <notify@grantdrop.app>";
const FROM_NAME = "Grantdrop";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDigestHtml(
  items: Giveaway[],
  siteUrl: string,
  frequency: "daily" | "weekly",
): string {
  const heading =
    frequency === "daily" ? "Today's free games" : "This week's free games";

  const rows = items
    .map((item) => {
      const price = item.worthAmount > 0 ? item.worth : "Valued deal";
      const platforms = item.platforms.slice(0, 4).join(" · ");
      return `
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #1f2833;">
          <a href="${escapeHtml(item.url)}" style="text-decoration:none;color:#f4f7fa;">
            <span style="font-size:16px;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(item.name)}</span>
          </a>
          <div style="margin-top:6px;font-size:13px;color:#8a99a8;">${escapeHtml(platforms || item.store)}</div>
        </td>
        <td align="right" style="padding:20px 0;border-bottom:1px solid #1f2833;white-space:nowrap;">
          <span style="font-size:14px;font-weight:700;color:#4AE3A0;">${escapeHtml(price)}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#080b10;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080b10;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111820;border:1px solid #1f2833;border-radius:14px;">
        <tr><td style="padding:28px 28px 8px;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Grantdrop</span>
        </td></tr>
        <tr><td style="padding:0 28px 20px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${heading}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#8a99a8;line-height:1.5;">
            ${items.length} new free-to-keep ${items.length === 1 ? "game" : "games"} matched your filters. Claim before the timer runs out.
          </p>
        </td></tr>
        <tr><td style="padding:0 28px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;">
          <a href="${escapeHtml(siteUrl)}/dashboard" style="display:inline-block;background:#4AE3A0;color:#06210f;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;">Open your hub</a>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#0d1319;border-top:1px solid #1f2833;">
          <p style="margin:0;font-size:12px;color:#6b7a8a;line-height:1.6;">
            You're receiving this because you turned on ${frequency} notifications.
            <a href="${escapeHtml(siteUrl)}/dashboard" style="color:#8a99a8;">Change your preferences</a>.
            Claims are completed on the publisher's own store.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export interface SendResult {
  sent: boolean;
  reason?: "missing_api_key" | "no_items";
}

/** Shared by the standalone action and the digest run. */
export async function sendMail(params: {
  to: string;
  items: Giveaway[];
  siteUrl: string;
  frequency: "daily" | "weekly";
}): Promise<SendResult> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "missing_api_key" };
  if (params.items.length === 0) return { sent: false, reason: "no_items" };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: params.to }],
      subject: `${params.items.length} new free ${
        params.items.length === 1 ? "game" : "games"
      } on Grantdrop`,
      html: renderDigestHtml(params.items, params.siteUrl, params.frequency),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MailerSend ${response.status}: ${detail.slice(0, 200)}`);
  }
  return { sent: true };
}

export const isConfigured = action({
  args: {},
  handler: async () => ({
    configured: Boolean(process.env.MAILERSEND_API_KEY),
  }),
});

/** Send one digest on demand — used for testing a user's own subscription. */
export const sendTestDigest = action({
  args: { to: v.string(), siteUrl: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const { loadThroughCache, buildParams } = await import("./feed");
    const params = buildParams({ sortBy: "newest" });
    const { data } = await loadThroughCache("digest-feed", params);
    const items = data.slice(0, 5);
    return sendMail({
      to: args.to,
      items,
      siteUrl: args.siteUrl ?? "https://grantdrop.app",
      frequency: "daily",
    });
  },
});
