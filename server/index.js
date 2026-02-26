require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const { TeamMember, Submission } = require('./models');
const { runFridayCron } = require('../agent/cron_friday');
const { runMondayCron } = require('../agent/cron_monday');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const formRoutes = require('./routes/form');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Middleware
if (isProd) {
  // In production, client is served from same origin — no CORS needed
  app.use(cors());
} else {
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
}
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/form', formRoutes);

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React static build in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback — all non-API routes serve index.html (React Router handles them)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Bootstrap admin account
async function ensureAdmin() {
  const adminEmail = 'brian55mwangi@gmail.com';
  const existing = await TeamMember.findOne({ email: adminEmail });
  if (!existing) {
    const passwordHash = await bcrypt.hash('draggonne', 12);
    await TeamMember.create({
      fullName: 'Brian Mwangi',
      email: adminEmail,
      role: 'admin',
      isActive: true,
      isSetup: true,
      passwordHash,
    });
    console.log(`✅ Admin account created: ${adminEmail}`);
  }
}

// Start
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Drop old unique index that prevented multiple submissions per member per week
    try {
      await Submission.collection.dropIndex('email_1_weekIdentifier_1');
      console.log('✅ Dropped old unique index on submissions');
    } catch (e) {
      // Index may not exist, that's fine
    }
    await ensureAdmin();

    // Schedule cron jobs (times in UTC; EAT = UTC+3)
    // Friday 00:00 UTC = 3:00 AM EAT — send form emails to team
    cron.schedule('0 0 * * 5', () => {
      console.log('[Cron] Triggering Friday email job...');
      runFridayCron();
    });

    // Saturday 15:00 UTC = 6:00 PM EAT — send notification to leadership
    cron.schedule('0 15 * * 6', () => {
      console.log('[Cron] Triggering Saturday notification job...');
      runMondayCron();
    });

    console.log('✅ Cron jobs scheduled (Fri 00:00 UTC, Sat 15:00 UTC)');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
