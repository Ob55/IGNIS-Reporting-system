/**
 * Send email via Resend API (HTTPS on port 443).
 * Railway blocks all SMTP ports — Resend HTTP API is the only option.
 */
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const sender = 'Ignis Innovation <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Resend API error: ${res.status}`);
  }

  return data;
}

module.exports = { sendEmail };
