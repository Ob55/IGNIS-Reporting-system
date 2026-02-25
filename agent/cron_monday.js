const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// ── Leadership Emails ─────────────────────────────────────────────────────
// These people receive the Monday notification email.
// Uncomment/add leaders as needed.
const LEADERSHIP_EMAILS = [
  // 'posogo@ignis-innovation.com',
  // 'dnderitu@ignis-innovation.com',
  'brian55mwangi@gmail.com',
  // 'cwilson@ignis-innovation.com',
];

// ── Models ────────────────────────────────────────────────────────────────
let Submission;
function getSubmissionModel() {
  if (Submission) return Submission;
  const schema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    workDone: String,
    upcomingWork: String,
    submissionTimestamp: Date,
    weekIdentifier: String,
    deletedAt: Date,
  });
  Submission = mongoose.models.Submission || mongoose.model('Submission', schema);
  return Submission;
}

let FormToken;
function getFormTokenModel() {
  if (FormToken) return FormToken;
  const schema = new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
    token: String,
    weekId: String,
    used: Boolean,
    expiresAt: Date,
    createdAt: Date,
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

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function runMondayCron() {
  console.log('[Monday Cron] Sending report notification to leadership...');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('[Monday Cron] MongoDB connected');
    }

    const Sub = getSubmissionModel();
    const FT = getFormTokenModel();
    const weekId = getCurrentWeekId();

    // Get stats for the week
    const tokens = await FT.find({ weekId }).lean();
    const submissions = await Sub.find({ weekIdentifier: weekId, deletedAt: null }).lean();

    const teamEmails = new Set();
    for (const t of tokens) teamEmails.add(t.email.toLowerCase());
    const totalMembers = teamEmails.size;

    const submittedEmails = new Set();
    for (const s of submissions) submittedEmails.add(s.email.toLowerCase());
    const totalSubmitted = submittedEmails.size;
    const totalMissing = totalMembers - totalSubmitted;

    const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`;

    console.log(`[Monday Cron] Week: ${weekId} | Team: ${totalMembers} | Submitted: ${totalSubmitted} | Missing: ${totalMissing}`);

    // Email notification to all leadership
    const transporter = getTransporter();
    for (const leaderEmail of LEADERSHIP_EMAILS) {
      try {
        await transporter.sendMail({
          from: `"Ignis Innovation" <${process.env.SMTP_USER}>`,
          to: leaderEmail,
          subject: `New Weekly Reports Submitted — ${weekId} | Ignis Innovation`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1B6B2F; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Ignis Innovation</h1>
                <p style="margin: 5px 0 0; opacity: 0.8;">Weekly Report Notification</p>
              </div>
              <div style="padding: 24px;">
                <p style="font-size: 16px;">Hi,</p>
                <p style="font-size: 16px;">There have been new weekly reports submitted for <strong>${weekId}</strong>.</p>
                <div style="background: #E8F5EC; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #333;"><strong>${totalSubmitted}</strong> of <strong>${totalMembers}</strong> members have submitted their reports.</p>
                  ${totalMissing > 0 ? `<p style="margin: 8px 0 0; font-size: 14px; color: #CC0000;"><strong>${totalMissing}</strong> report(s) still missing.</p>` : '<p style="margin: 8px 0 0; font-size: 14px; color: #1B6B2F;">All reports submitted!</p>'}
                </div>
                <p style="font-size: 16px;">Kindly review the reports on the dashboard:</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${dashboardUrl}" style="background: #1B6B2F; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Open Dashboard</a>
                </div>
                <p style="color: #999; font-size: 13px; margin-top: 30px;">— Ignis Report System</p>
              </div>
            </div>
          `,
        });
        console.log(`[Monday Cron] ✅ Notification emailed to ${leaderEmail}`);
      } catch (emailErr) {
        console.error(`[Monday Cron] ❌ Failed to email ${leaderEmail}:`, emailErr.message);
      }
    }

    console.log('[Monday Cron] Done.');
  } catch (err) {
    console.error('[Monday Cron] Error:', err.message);
  }
}

module.exports = { runMondayCron };
