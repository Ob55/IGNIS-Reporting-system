const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { sendEmail } = require('../server/utils/email');

// ── Team Members ──────────────────────────────────────────────────────────
// These are the people who receive the weekly form email.
// Uncomment/add members as needed.
const members = [
  { firstName: 'Lily',      lastName: 'Ronoh',   email: 'lronoh@ignis-innovation.com' },
  { firstName: 'Elizabeth', lastName: 'Ooro',    email: 'eooro@ignis-innovation.com' },
  { firstName: 'Wilson',    lastName: 'Muthui',  email: 'wmuthui@ignis-innovation.com' },
  { firstName: 'Brian',     lastName: 'Mwangi',  email: 'bmwangi@ignis-innovation.com' },
  { firstName: 'Curtis',    lastName: 'Wilson',  email: 'cwilson@ignis-innovation.com' },

//  { firstName: 'Alvin',     lastName: 'kyalo',  email: 'mr.amok55@gmail.com' },

  // ── Add more team members below ──────────────────────────────────────
  // { firstName: 'Jane', lastName: 'Doe', email: 'jdoe@ignis-innovation.com' },
];

// ── FormToken schema (matches server) ─────────────────────────────────────
let FormToken;
function getFormTokenModel() {
  if (FormToken) return FormToken;
  const schema = new mongoose.Schema({
    email:     { type: String, required: true, lowercase: true },
    firstName: { type: String },
    lastName:  { type: String },
    token:     { type: String, required: true, unique: true },
    weekId:    { type: String, required: true },
    used:      { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  });
  FormToken = mongoose.models.FormToken || mongoose.model('FormToken', schema);
  return FormToken;
}

function getCurrentWeekId() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
  return `W${String(weekNum).padStart(2, '0')}-${now.getFullYear()}`;
}

function getSaturdayNoonExpiry() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun,1=Mon,...5=Fri,6=Sat
  let daysUntilSat = (6 - day + 7) % 7;
  if (daysUntilSat === 0) daysUntilSat = 7;
  const saturday = new Date(now);
  saturday.setUTCDate(saturday.getUTCDate() + daysUntilSat);
  saturday.setUTCHours(9, 0, 0, 0); // 12:00 PM EAT = 9:00 AM UTC
  return saturday;
}

async function runFridayCron() {
  console.log('[Friday Cron] Starting...');

  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('[Friday Cron] MongoDB connected');
    }

    const FT = getFormTokenModel();
    const weekId = getCurrentWeekId();
    const expiresAt = getSaturdayNoonExpiry();
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    console.log(`[Friday Cron] Week: ${weekId} | ${members.length} team members`);

    let sent = 0;

    for (let i = 0; i < members.length; i++) {
      const m = members[i];

      // Delay 1s between emails to avoid Resend rate limit (2 req/s)
      if (i > 0) await new Promise(r => setTimeout(r, 1000));

      // Check if token already exists for this member+week
      let existing = await FT.findOne({ email: m.email.toLowerCase(), weekId, used: false });
      let formUrl;

      if (existing) {
        formUrl = `${clientUrl}/report-form?token=${existing.token}`;
        console.log(`[Friday Cron] Token already exists for ${m.email}`);
      } else {
        const token = uuidv4();
        await FT.create({
          email: m.email.toLowerCase(),
          firstName: m.firstName,
          lastName: m.lastName,
          token,
          weekId,
          expiresAt,
        });
        formUrl = `${clientUrl}/report-form?token=${token}`;
      }

      // Send email via Resend API
      try {
        await sendEmail({
          to: m.email,
          subject: `Weekly Report — ${weekId} | Please Submit by Saturday`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1B6B2F; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Ignis Innovation</h1>
                <p style="margin: 5px 0 0; opacity: 0.8;">Weekly Report System</p>
              </div>
              <div style="padding: 20px;">
                <p>Hello <strong>${m.firstName} ${m.lastName}</strong>,</p>
                <p>Please submit your weekly report for <strong>${weekId}</strong>. Click the button below to open your form:</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${formUrl}" style="background: #1B6B2F; color: white; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Submit My Report</a>
                </p>
                <p style="color: #666; font-size: 14px;">This link expires Saturday at 12:00 PM EAT. Please submit before then.</p>
                <p style="color: #999; font-size: 12px;">If the button doesn't work, copy this URL:<br>${formUrl}</p>
              </div>
              <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 12px; color: #999;">
                Ignis Innovation — Confidential
              </div>
            </div>
          `,
        });
        console.log(`[Friday Cron] ✅ Email sent to ${m.firstName} ${m.lastName} (${m.email})`);
        sent++;
      } catch (emailErr) {
        console.error(`[Friday Cron] ❌ Failed to email ${m.email}:`, emailErr.message);
      }
    }

    console.log(`[Friday Cron] Done. ${sent}/${members.length} emails sent.`);
  } catch (err) {
    console.error('[Friday Cron] Error:', err.message);
  }
}

module.exports = { runFridayCron };
