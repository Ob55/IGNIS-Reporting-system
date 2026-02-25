const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// ── Team Members ──────────────────────────────────────────────────────────
// These are the people who receive the weekly form email.
// Uncomment/add members as needed.
const members = [
  // { firstName: 'Lily',      lastName: 'Ronoh',   email: 'lronoh@ignis-innovation.com' },
  // { firstName: 'Elizabeth', lastName: 'Ooro',    email: 'eooro@ignis-innovation.com' },
  // { firstName: 'Wilson',    lastName: 'Muthui',  email: 'wmuthui@ignis-innovation.com' },
  { firstName: 'Brian',     lastName: 'Mwangi',  email: 'bmwangi@ignis-innovation.com' },
//  { firstName: 'Alvin',     lastName: 'kyalo',  email: 'mr.amok55@gmail.com' },

  // { firstName: 'Curtis',    lastName: 'Wilson',  email: 'cwilson@ignis-innovation.com' },
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

function getNextMondayExpiry() {
  const now = new Date();
  const day = now.getUTCDay();
  let daysUntilMon = (8 - day) % 7;
  if (daysUntilMon === 0) daysUntilMon = 7;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + daysUntilMon);
  monday.setUTCHours(3, 0, 0, 0); // 6:00 AM EAT = 3:00 AM UTC
  return monday;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
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
    const expiresAt = getNextMondayExpiry();
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    console.log(`[Friday Cron] Week: ${weekId} | ${members.length} team members`);

    const transporter = getTransporter();
    let sent = 0;

    for (const m of members) {
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

      // Send email
      try {
        await transporter.sendMail({
          from: `"Ignis Innovation" <${process.env.SMTP_USER}>`,
          to: m.email,
          subject: `Weekly Report — ${weekId} | Please Submit by Monday`,
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
                <p style="color: #666; font-size: 14px;">This link expires Monday at 6:00 AM EAT. Please submit before then.</p>
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
