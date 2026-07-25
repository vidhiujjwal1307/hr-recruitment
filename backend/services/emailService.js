const nodemailer = require('nodemailer');

async function sendInterviewInvite(toEmail, interviewDetails) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log(`[EmailService] Sending interview invite email to ${toEmail}...`);

    const info = await transporter.sendMail({
      from: `"RecruitAI" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Interview Scheduled: ${interviewDetails.jobTitle || 'Your Application'}`,
      text: `Hi,\n\nYou've been scheduled for an interview.\n\nDate/Time: ${interviewDetails.dateTime}\nJob: ${interviewDetails.jobTitle}\n\nBest,\nRecruitAI Team`,
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

module.exports = { sendInterviewInvite };