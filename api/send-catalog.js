// Vercel serverless function — emails the wholesale catalog PDF to a visitor.
//
// Triggered by index.html's "Request Wholesale Product & Pricing Info" box.
// Sends FROM sales@bauersbrew.com via Gmail SMTP (nodemailer) with the
// repo-root PDF attached.
//
// Required environment variables (set in the Vercel project):
//   GMAIL_USER          = the Gmail/Workspace account that authenticates
//                         (e.g. mike@bauersbrew.com)
//   GMAIL_APP_PASSWORD  = 16-character Google App Password (spaces optional)
//   GMAIL_FROM          = optional; the visible "From" address.
//                         Defaults to sales@bauersbrew.com. The auth account
//                         must be allowed to "send as" this address (it is,
//                         automatically, when it's an alias of that account).
//
// To update the catalog later: replace the same-named PDF in the repo root
// and push. Nothing here needs to change.

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const PDF_FILENAME = 'Wholesale_BauersBrew_LineSheet_2026.pdf';

// Resolve the PDF across the possible locations a Vercel function may see it.
function resolvePdfPath() {
  const candidates = [
    path.join(process.cwd(), PDF_FILENAME),
    path.join(__dirname, '..', PDF_FILENAME),
    path.join('/var/task', PDF_FILENAME),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (e) {
      /* keep looking */
    }
  }
  return candidates[0];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
  return raw;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readBody(req);
  const email = String((body && body.email) || '').trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const user = process.env.GMAIL_USER; // account that authenticates to Gmail SMTP
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, ''); // strip spaces from app password
  const fromAddress = process.env.GMAIL_FROM || 'sales@bauersbrew.com'; // visible sender

  if (!user || !pass) {
    console.error('send-catalog: GMAIL_USER / GMAIL_APP_PASSWORD not configured');
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const pdfPath = resolvePdfPath();

  const text =
    'Hi there,\n\n' +
    "Thank you for your interest in Bauer's Brew wholesale! Our line sheet is " +
    'attached, with all the information you need.\n\n' +
    "Any questions, just reply to this email — we're happy to help.\n\n" +
    'Warmly,\n' +
    "The Bauer's Brew Team\n" +
    'sales@bauersbrew.com';

  const html =
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:15px;line-height:1.6;color:#111;">' +
    '<p>Hi there,</p>' +
    "<p>Thank you for your interest in <strong>Bauer's Brew</strong> wholesale! " +
    'Our line sheet is attached, with all the information you need.</p>' +
    "<p>Any questions, just reply to this email &mdash; we're happy to help.</p>" +
    '<p style="margin-top:22px;">Warmly,<br>' +
    "The Bauer's Brew Team<br>" +
    '<a href="mailto:sales@bauersbrew.com" style="color:#C99D28;">sales@bauersbrew.com</a></p>' +
    '</div>';

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Bauer's Brew Wholesale" <${fromAddress}>`,
      replyTo: fromAddress,
      to: email,
      subject: "Your Bauer's Brew Wholesale Line Sheet",
      text,
      html,
      attachments: [
        {
          filename: PDF_FILENAME,
          path: pdfPath,
          contentType: 'application/pdf',
        },
      ],
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-catalog: failed to send', err && err.message ? err.message : err);
    return res.status(502).json({ error: 'Could not send the line sheet. Please try again.' });
  }
};
