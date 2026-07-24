const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

router.post('/google', async (req, res) => {
  try {
    const idToken = req.body?.credential || req.body?.idToken;

    if (!idToken) {
      return res.status(401).json({ success: false, message: 'Google ID token is required.' });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
      console.error('GOOGLE_CLIENT_ID or JWT_SECRET is not configured.');
      return res.status(401).json({ success: false, message: 'Google login is not configured.' });
    }

    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ success: false, message: 'Google account email could not be verified.' });
    }

    const googleId = payload.sub;
    const userData = {
      googleId,
      name: payload.name || '',
      email: payload.email,
      picture: payload.picture || '',
      authProvider: 'google',
    };

    const existingByEmail = await User.findOne({ email: normalizeEmail(payload.email) });
    if (existingByEmail && existingByEmail.authProvider === 'local') {
      return res.status(400).json({ success: false, message: 'This email is registered with email and password. Please log in with your password.' });
    }

    const user = await User.findOneAndUpdate(
      { $or: [{ googleId }, { email: normalizeEmail(payload.email) }] },
      { $set: userData, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true, runValidators: true }
    );

    const appToken = signToken(user);

    return res.json({
      token: appToken,
      user: { name: user.name, email: user.email, picture: user.picture },
    });
  } catch (error) {
    console.error('Google authentication failed:', error.message);
    return res.status(401).json({ success: false, message: 'Google login failed. Please try again.' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (!emailPattern.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const message = existingUser.authProvider === 'google'
        ? 'This email is already registered with Google Sign-In.'
        : 'Email already registered.';
      return res.status(400).json({ success: false, message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, authProvider: 'local' });
    const token = signToken(user);

    return res.status(201).json({ token, user: { name: user.name, email: user.email } });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    console.error('Signup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create your account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    if (!emailPattern.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.authProvider === 'google') {
      return res.status(401).json({ success: false, message: 'This account uses Google Sign-In.' });
    }
    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ token, user: { name: user.name, email: user.email, picture: user.picture } });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to log in. Please try again.' });
  }
});

router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    if (user.authProvider === 'google') {
      return res.status(400).json({ success: false, message: 'Google Sign-In accounts cannot change a password here.' });
    }
    if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Password change failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to change password. Please try again.' });
  }
});

module.exports = router;
