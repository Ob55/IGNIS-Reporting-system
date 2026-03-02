/**
 * Send email via Resend API (HTTPS port 443).
 * Railway blocks all SMTP ports — this is the only way.
 * Once ignis-innovation.com domain is verified on Resend,
 * emails will send from info@ignis-innovation.com to anyone.
 */
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const from = process.env.MAIL_FROM
    ? `Ignis Innovation <${process.env.MAIL_FROM}>`
    : 'Ignis Innovation <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Resend error: ${res.status}`);

  console.log('Email sent:', data.id, '→', to);
  return data;
}

module.exports = { sendEmail };
