const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

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
    };

    const user = await User.findOneAndUpdate(
      { googleId },
      { $set: userData, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true, runValidators: true }
    );

    const appToken = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token: appToken,
      user: { name: user.name, email: user.email, picture: user.picture },
    });
  } catch (error) {
    console.error('Google authentication failed:', error.message);
    return res.status(401).json({ success: false, message: 'Google login failed. Please try again.' });
  }
});

module.exports = router;
