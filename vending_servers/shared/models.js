'use strict';

const { mongoose } = require('./mongo');

const MachineStateSchema = new mongoose.Schema(
  {
    machineId: { type: String, index: true, unique: true },
    metrics: {
      type: Map,
      of: new mongoose.Schema(
        {
          value: mongoose.Schema.Types.Mixed,
          ts: Date,
          rawType: String,
        },
        { _id: false }
      ),
      default: {},
    },
    lastSeenAt: { type: Date, index: true },
  },
  { timestamps: true, collection: 'machine_states' }
);

const ReadingSchema = new mongoose.Schema(
  {
    machineId: { type: String, index: true },
    metric: { type: String, index: true },
    topic: String,

    value: mongoose.Schema.Types.Mixed,
    numericValue: { type: Number, index: true },

    rawType: String,
    ts: { type: Date, index: true },
  },
  { timestamps: true, collection: 'readings' }
);

ReadingSchema.index({ machineId: 1, metric: 1, ts: -1 });

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, collection: 'users' }
);

const PasswordResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'password_reset_tokens' }
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MachineState = mongoose.model('MachineState', MachineStateSchema);
const Reading = mongoose.model('Reading', ReadingSchema);
const User = mongoose.model('User', UserSchema);
const PasswordResetToken = mongoose.model('PasswordResetToken', PasswordResetTokenSchema);

module.exports = { MachineState, Reading, User, PasswordResetToken };
