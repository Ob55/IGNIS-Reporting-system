const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Submission, FormToken } = require('../models');

const router = express.Router();

// File upload config
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB per file

// GET /api/form/info?token=xxx
router.get('/info', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const formToken = await FormToken.findOne({ token });
    if (!formToken) return res.status(400).json({ error: 'Invalid form link' });
    if (formToken.used) return res.status(400).json({ error: 'This form has already been submitted' });
    if (formToken.expiresAt < new Date()) return res.status(400).json({ error: 'This form link has expired' });

    res.json({
      firstName: formToken.firstName || '',
      lastName: formToken.lastName || '',
      email: formToken.email,
      weekId: formToken.weekId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/form/submit — now accepts multipart with optional file attachments
router.post('/submit', upload.array('attachments', 10), async (req, res) => {
  try {
    const { token, workDone, upcomingWork } = req.body;
    if (!token || !workDone || !upcomingWork) {
      return res.status(400).json({ error: 'Token, workDone, and upcomingWork are required' });
    }

    const formToken = await FormToken.findOne({ token });
    if (!formToken) return res.status(400).json({ error: 'Invalid form link' });
    if (formToken.used) return res.status(400).json({ error: 'This form has already been submitted' });
    if (formToken.expiresAt < new Date()) return res.status(400).json({ error: 'This form link has expired' });

    // Build attachments array from uploaded files
    const attachments = (req.files || []).map(f => ({
      originalName: f.originalname,
      fileName: f.filename,
      size: f.size,
    }));

    // Create new submission (each report is saved separately)
    await Submission.create({
      firstName: formToken.firstName || '',
      lastName: formToken.lastName || '',
      email: formToken.email,
      workDone,
      upcomingWork,
      attachments,
      submissionTimestamp: new Date(),
      weekIdentifier: formToken.weekId,
    });

    formToken.used = true;
    await formToken.save();

    res.json({ message: 'Report submitted successfully', weekId: formToken.weekId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
