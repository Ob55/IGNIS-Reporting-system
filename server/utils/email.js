const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: { ciphers: 'SSLv3' },
});

async function sendEmail({ to, subject, html }) {
  const from = `"Ignis Innovation" <${process.env.MAIL_USERNAME}>`;
  const info = await transporter.sendMail({ from, to, subject, html });
  console.log('Email sent:', info.messageId, '→', to);
  return { messageId: info.messageId };
}

module.exports = { sendEmail };
