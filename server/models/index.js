const mongoose = require('mongoose');

// --- Submission ---
const submissionSchema = new mongoose.Schema({
  firstName:           { type: String, required: true },
  lastName:            { type: String, required: true },
  email:               { type: String, required: true, lowercase: true },
  workDone:            { type: String, required: true },
  upcomingWork:        { type: String, required: true },
  attachments:         [{ originalName: String, fileName: String, size: Number }],
  submissionTimestamp: { type: Date, default: Date.now },
  weekIdentifier:      { type: String, required: true },
  deletedAt:           { type: Date, default: null },
});

submissionSchema.index({ email: 1, weekIdentifier: 1 });

// --- TeamMember ---
const teamMemberSchema = new mongoose.Schema({
  fullName:          { type: String, required: true },
  email:             { type: String, required: true, unique: true, lowercase: true },
  isActive:          { type: Boolean, default: true },
  role:              { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  passwordHash:      { type: String, default: null },
  setupToken:        { type: String, default: null },
  setupTokenExpires: { type: Date, default: null },
  isSetup:           { type: Boolean, default: false },
}, { timestamps: true });

// --- FormToken ---
const formTokenSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true },
  firstName: { type: String },
  lastName:  { type: String },
  token:     { type: String, required: true, unique: true },
  weekId:    { type: String, required: true },
  used:      { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Submission = mongoose.model('Submission', submissionSchema);
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
const FormToken  = mongoose.model('FormToken', formTokenSchema);

module.exports = { Submission, TeamMember, FormToken };
