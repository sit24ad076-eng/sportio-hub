import nodemailer from "nodemailer";

export async function sendOtpEmail(to, name, otp) {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Email service is not configured. Missing: ${missing.join(", ")}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Your Sportio Hub verification code",
    text: `Hello ${name}, your Sportio Hub email verification code is ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#123b63">Welcome to Sportio Hub</h2><p>Hello ${escapeHtml(name)},</p><p>Use this code to verify your email address:</p><div style="font-size:32px;letter-spacing:8px;font-weight:bold;background:#eef4f8;padding:18px;text-align:center;border-radius:12px">${otp}</div><p>This code expires in 10 minutes. Do not share it with anyone.</p></div>`
  });
}
function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
