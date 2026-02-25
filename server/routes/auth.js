const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { TeamMember } = require('../models');
const { verifyToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

function signToken(member) {
  return jwt.sign(
    { id: member._id, email: member.email, role: member.role, fullName: member.fullName },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const member = await TeamMember.findOne({ email: email.toLowerCase() });
    if (!member) return res.status(401).json({ error: 'Invalid credentials' });
    if (!member.isSetup) return res.status(401).json({ error: 'Account not activated. Check your email for the setup link.' });

    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(member);
    res.json({
      token,
      user: { id: member._id, fullName: member.fullName, email: member.email, role: member.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify-setup?token=xxx
router.get('/verify-setup', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const member = await TeamMember.findOne({ setupToken: token });
    if (!member) return res.status(400).json({ error: 'Invalid or already used setup link' });
    if (member.isSetup) return res.status(400).json({ error: 'Account already activated' });
    if (member.setupTokenExpires < new Date()) return res.status(400).json({ error: 'Setup link has expired' });

    res.json({ fullName: member.fullName, email: member.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/setup-password
router.post('/setup-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    const member = await TeamMember.findOne({ setupToken: token });
    if (!member) return res.status(400).json({ error: 'Invalid or already used setup link' });
    if (member.isSetup) return res.status(400).json({ error: 'Account already activated' });
    if (member.setupTokenExpires < new Date()) return res.status(400).json({ error: 'Setup link has expired' });

    member.passwordHash = await bcrypt.hash(password, 12);
    member.isSetup = true;
    member.setupToken = null;
    member.setupTokenExpires = null;
    await member.save();

    const jwt_token = signToken(member);
    res.json({
      token: jwt_token,
      user: { id: member._id, fullName: member.fullName, email: member.email, role: member.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/members  (Admin only)
router.post('/members', verifyToken, adminOnly, async (req, res) => {
  try {
    const { fullName, email, role } = req.body;
    if (!fullName || !email) return res.status(400).json({ error: 'Full name and email required' });

    const exists = await TeamMember.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'A member with this email already exists' });

    const setupToken = uuidv4();
    const setupTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const member = await TeamMember.create({
      fullName,
      email: email.toLowerCase(),
      role: role || 'viewer',
      setupToken,
      setupTokenExpires,
    });

    const setupLink = `${process.env.CLIENT_URL}/setup-password?token=${setupToken}`;

    // Send setup email
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Ignis Innovation" <${process.env.SMTP_USER}>`,
        to: member.email,
        subject: 'Welcome to Ignis Innovation — Set Up Your Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1B6B2F; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Ignis Innovation</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hello <strong>${member.fullName}</strong>,</p>
              <p>You have been added to the Ignis Weekly Report System. Click the button below to set your password and activate your account:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${setupLink}" style="background: #1B6B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up My Account</a>
              </p>
              <p style="color: #666; font-size: 14px;">This link expires in 7 days. If the button doesn't work, copy this URL:<br>${setupLink}</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    res.status(201).json({ member: { id: member._id, fullName: member.fullName, email: member.email, role: member.role }, setupLink });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/resend-setup  (Admin only)
router.post('/resend-setup', verifyToken, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const member = await TeamMember.findOne({ email: email.toLowerCase() });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.isSetup) return res.status(400).json({ error: 'Account already activated' });

    const setupToken = uuidv4();
    member.setupToken = setupToken;
    member.setupTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await member.save();

    const setupLink = `${process.env.CLIENT_URL}/setup-password?token=${setupToken}`;

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Ignis Innovation" <${process.env.SMTP_USER}>`,
        to: member.email,
        subject: 'Ignis Innovation — New Setup Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1B6B2F; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Ignis Innovation</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hello <strong>${member.fullName}</strong>,</p>
              <p>Here is a new setup link for your account:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${setupLink}" style="background: #1B6B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up My Account</a>
              </p>
              <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    res.json({ setupLink });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
