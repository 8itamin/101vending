'use strict';

require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const { promisify } = require('util');
const { connectMongo } = require('../shared/mongo');
const { MachineState, Reading, User, PasswordResetToken } = require('../shared/models');

const app = express();
const scrypt = promisify(crypto.scrypt);

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:4200';
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'dev-only-change-me';
const AUTH_TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7);
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowOrigin = origin && origin === FRONTEND_ORIGIN ? origin : FRONTEND_ORIGIN;

  res.header('Access-Control-Allow-Origin', allowOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  next();
});

app.use(express.json());

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  const [saltHex, keyHex] = String(passwordHash || '').split(':');
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await scrypt(password, salt, expectedKey.length);

  if (actualKey.length !== expectedKey.length) return false;
  return crypto.timingSafeEqual(actualKey, expectedKey);
}

function signAuthToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function createAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(user._id),
    email: user.email,
    iat: now,
    exp: now + AUTH_TOKEN_TTL_SECONDS,
  };

  return signAuthToken(payload);
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function responseMessage(err, fallbackMessage) {
  if (err && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallbackMessage;
}

async function main() {
  await connectMongo();

  app.post('/api/auth/register', async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      }

      const existing = await User.findOne({ email }).lean();
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email is already registered' });
      }

      const passwordHash = await hashPassword(password);
      await User.create({ name: name || undefined, email, passwordHash });

      return res.status(201).json({ success: true, message: 'Account created successfully' });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ success: false, message: 'Email is already registered' });
      }
      return res.status(500).json({ success: false, message: responseMessage(err, 'Registration failed') });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = createAuthToken(user);
      return res.json({ success: true, token });
    } catch (err) {
      return res.status(500).json({ success: false, message: responseMessage(err, 'Login failed') });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Valid email is required' });
      }

      const user = await User.findOne({ email });
      if (user) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

        await PasswordResetToken.create({
          userId: user._id,
          tokenHash,
          expiresAt,
        });

        console.log(`[password-reset] email=${email} token=${rawToken} expiresAt=${expiresAt.toISOString()}`);
      }

      return res.json({
        success: true,
        message: 'If an account with this email exists, password reset instructions have been sent',
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: responseMessage(err, 'Failed to process password reset request') });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const token = String(req.body?.token || '').trim();
      const newPassword = String(req.body?.password || '');

      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and password are required' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      }

      const tokenHash = hashResetToken(token);
      const resetEntry = await PasswordResetToken.findOne({ tokenHash, usedAt: null });
      if (!resetEntry || resetEntry.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      const passwordHash = await hashPassword(newPassword);
      await User.updateOne({ _id: resetEntry.userId }, { $set: { passwordHash } });

      resetEntry.usedAt = new Date();
      await resetEntry.save();

      return res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: responseMessage(err, 'Failed to reset password') });
    }
  });

  app.get('/api/machines', async (req, res) => {
    try {
      const items = await MachineState.find().sort({ updatedAt: -1 });
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching machines', error: String(err) });
    }
  });

  app.get('/api/machines/:id', async (req, res) => {
    try {
      const item = await MachineState.findOne({ machineId: req.params.id });
      if (!item) return res.status(404).json({ message: 'Not found' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching machine', error: String(err) });
    }
  });

  app.get('/api/readings', async (req, res) => {
    try {
      const { machineId, metric } = req.query;
      const limit = Math.min(Number(req.query.limit || 200), 2000);

      const q = {};
      if (machineId) q.machineId = machineId;
      if (metric) q.metric = metric;

      const items = await Reading.find(q).sort({ ts: -1 }).limit(limit);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching readings', error: String(err) });
    }
  });

  app.listen(PORT, () => {
    console.log(`API server is running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error('API startup failed', e);
  process.exit(1);
});
