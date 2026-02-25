require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { TeamMember, Submission } = require('./models');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const formRoutes = require('./routes/form');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/form', formRoutes);

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
