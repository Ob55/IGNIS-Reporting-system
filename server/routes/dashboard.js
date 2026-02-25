const express = require('express');
const { Submission, TeamMember, FormToken } = require('../models');
const { verifyToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Helper: get current week identifier e.g. "W08-2026"
function getCurrentWeekId() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
  return `W${String(weekNum).padStart(2, '0')}-${now.getFullYear()}`;
}

// Auto-purge: permanently delete reports that have been in recycle bin > 10 days
async function autoPurge() {
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const result = await Submission.deleteMany({ deletedAt: { $ne: null, $lt: cutoff } });
  if (result.deletedCount > 0) {
    console.log(`[Auto-Purge] Permanently deleted ${result.deletedCount} report(s)`);
  }
}

// GET /api/dashboard?week=W08-2026
router.get('/', verifyToken, async (req, res) => {
  try {
    await autoPurge();
    const weekId = req.query.week || getCurrentWeekId();

    const tokens = await FormToken.find({ weekId }).lean();
    const submissions = await Submission.find({ weekIdentifier: weekId, deletedAt: null })
      .sort({ submissionTimestamp: -1 }).lean();

    const teamMap = {};
    for (const t of tokens) {
      const key = t.email.toLowerCase();
      if (!teamMap[key]) {
        teamMap[key] = {
          _id: t._id,
          fullName: `${t.firstName || ''} ${t.lastName || ''}`.trim(),
          email: t.email,
        };
      }
    }

    // Group submissions by email — keep latest as primary, count all
    const submissionMap = {};
    for (const s of submissions) {
      const key = s.email.toLowerCase();
      if (!submissionMap[key]) {
        submissionMap[key] = { latest: s, count: 1 };
      } else {
        submissionMap[key].count++;
      }
    }

    const teamList = Object.values(teamMap);
    const data = teamList.map(m => {
      const entry = submissionMap[m.email.toLowerCase()];
      return {
        ...m,
        submitted: !!entry,
        submission: entry ? entry.latest : null,
        submissionCount: entry ? entry.count : 0,
      };
    });

    const total = data.length;
    const submitted = data.filter(d => d.submitted).length;
    const missing = total - submitted;

    res.json({ weekId, members: data, stats: { total, submitted, missing } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/weeks
router.get('/weeks', verifyToken, async (req, res) => {
  try {
    const tokenWeeks = await FormToken.distinct('weekId');
    const subWeeks = await Submission.distinct('weekIdentifier', { deletedAt: null });
    const currentWeek = getCurrentWeekId();

    const weekSet = new Set([...tokenWeeks, ...subWeeks, currentWeek]);
    const weeks = Array.from(weekSet);

    weeks.sort((a, b) => {
      const [wa, ya] = a.replace('W', '').split('-').map(Number);
      const [wb, yb] = b.replace('W', '').split('-').map(Number);
      if (ya !== yb) return yb - ya;
      return wb - wa;
    });

    res.json({ weeks, currentWeek });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/history?email=xxx — all reports for a specific member (newest first)
router.get('/history', verifyToken, async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const submissions = await Submission.find({ email, deletedAt: null })
      .sort({ submissionTimestamp: -1 })
      .lean();

    // Get member name from most recent token or submission
    let fullName = '';
    if (submissions.length > 0) {
      fullName = `${submissions[0].firstName} ${submissions[0].lastName}`.trim();
    } else {
      const token = await FormToken.findOne({ email }).sort({ createdAt: -1 }).lean();
      if (token) fullName = `${token.firstName || ''} ${token.lastName || ''}`.trim();
    }

    res.json({ email, fullName, submissions });
  } catch (err) {
    console.error('[History] Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/dashboard/submissions/:id — soft delete (move to recycle bin)
router.delete('/submissions/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Report not found' });
    if (submission.deletedAt) return res.status(400).json({ error: 'Already in recycle bin' });

    submission.deletedAt = new Date();
    await submission.save();

    res.json({ message: 'Report moved to recycle bin' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/recycle-bin — list soft-deleted reports
router.get('/recycle-bin', verifyToken, adminOnly, async (req, res) => {
  try {
    await autoPurge();
    const deleted = await Submission.find({ deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .lean();

    // Add days remaining before permanent deletion
    const items = deleted.map(d => {
      const daysLeft = Math.max(0, Math.ceil((d.deletedAt.getTime() + 10 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
      return { ...d, daysLeft };
    });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dashboard/recycle-bin/restore/:id — restore from recycle bin
router.post('/recycle-bin/restore/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Report not found' });
    if (!submission.deletedAt) return res.status(400).json({ error: 'Report is not deleted' });

    submission.deletedAt = null;
    await submission.save();

    res.json({ message: 'Report restored' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/dashboard/recycle-bin/:id — permanently delete
router.delete('/recycle-bin/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await Submission.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Report not found' });

    res.json({ message: 'Report permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/members  (Admin only)
router.get('/members', verifyToken, adminOnly, async (req, res) => {
  try {
    const members = await TeamMember.find().select('-passwordHash').lean();
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/dashboard/members/:id  (Admin only)
router.patch('/members/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const update = {};
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (role === 'admin' || role === 'viewer') update.role = role;

    const member = await TeamMember.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    if (!member) return res.status(404).json({ error: 'Member not found' });

    res.json({ member });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
