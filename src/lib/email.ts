/**
 * Transactional email via Resend's REST API (no SDK dependency).
 * Email failures must never block a paid order, so this never throws.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Live Artist Checkout <onboarding@resend.dev>';
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set; skipping email to', opts.to);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error('[email] Resend error', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

export function receiptEmail(p: {
  customerName: string;
  eventTitle: string;
  type: 'digital' | 'print';
  productSize: string | null;
  amount: number;
  currency: string;
  artworkUrl: string;
}) {
  const what = p.type === 'digital' ? 'Digital portrait' : `${p.productSize} archival print`;
  const extra =
    p.type === 'digital'
      ? `<p><a href="${esc(p.artworkUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Download your portrait</a></p>`
      : `<p>Your ${esc(p.productSize || '')} print has been sent to our print lab. We'll email you when it ships.</p><p><a href="${esc(p.artworkUrl)}">View your artwork</a></p>`;
  return {
    subject: `Your portrait from ${p.eventTitle}`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:auto;color:#0f172a">
      <h2>Thanks, ${esc(p.customerName)}!</h2>
      <p>Payment received for <strong>${esc(what)}</strong> from <strong>${esc(p.eventTitle)}</strong>.</p>
      <p>Total: <strong>${esc(money(p.amount, p.currency))}</strong></p>
      ${extra}
      <p style="color:#64748b;font-size:12px">Keep this email &mdash; the link above is your personal download page.</p>
    </div>`,
  };
}
