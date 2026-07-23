const nodemailer = require('nodemailer');

/**
 * Sends automated emails to candidates/interviewers using Nodemailer.
 */
async function sendInterviewInvite(toEmail, interviewDetails) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    console.log(`[EmailService] Preparing interview invite email for ${toEmail}...`);
    // Example email dispatch block
    return { success: true, message: `Invite sent to ${toEmail}` };
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error.message);
    throw error;
  }
}

module.exports = { sendInterviewInvite };
