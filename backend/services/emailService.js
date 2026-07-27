const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

async function sendInterviewInvite(toEmail, interviewDetails) {
  try {
    const transporter = createTransporter();

    console.log(`[EmailService] Sending interview invite email to ${toEmail}...`);

    const info = await transporter.sendMail({
      from: `"RecruitAI" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Interview Scheduled: ${interviewDetails.jobTitle || 'Your Application'}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>Interview Scheduled</h2>
          <p>Hi,</p>
          <p>You've been scheduled for an interview for <strong>${interviewDetails.jobTitle}</strong>.</p>
          <p><strong>Date/Time:</strong> ${interviewDetails.dateTime}</p>
          <p>Best,<br/>RecruitAI Team</p>
        </div>
      `,
    });

    console.log(`[EmailService] Email sent: ${info.messageId}`);
    return { success: true, message: `Invite sent to ${toEmail}`, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error.message);
    throw error;
  }
}

async function sendVideoInterviewInvite(toEmail, { question, videoInterviewLink }) {
  try {
    const transporter = createTransporter();
    const safeQuestion = escapeHtml(question);
    const safeLink = escapeHtml(videoInterviewLink);

    console.log(`[EmailService] Sending video interview invite email to ${toEmail}...`);
    const info = await transporter.sendMail({
      from: `"RecruitAI" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Your RecruitAI Video Interview',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Video Interview Invitation</h2>
          <p>Hi,</p>
          <p>Please respond to this interview question:</p>
          <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px;">${safeQuestion}</blockquote>
          <p>Click the link below to record or upload your video response to this question.</p>
          <p><a href="${safeLink}">Start your video interview</a></p>
          <p style="font-size: 13px; color: #555;">By submitting a video response, you consent to it being processed by AI for interview screening purposes.</p>
          <p>Best,<br/>RecruitAI Team</p>
        </div>`,
    });
    console.log(`[EmailService] Video interview invite sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Failed to send video interview invite:', error.message);
    throw error;
  }
}

module.exports = { sendInterviewInvite, sendVideoInterviewInvite };
