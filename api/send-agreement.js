// Vercel serverless function — emails an approved applicant their signing link,
// sent FROM sales@bauersbrew.com via Gmail. Triggered by the "Approve" button
// on the internal /approve page (so the owner no longer needs a desktop mail app).
//
// Protected by a shared secret that only the password-gated /approve page knows,
// so this cannot be used as an open email relay.
//
// Env: GMAIL_USER, GMAIL_APP_PASSWORD (+ optional GMAIL_FROM, ADMIN_SECRET)

const nodemailer = require('nodemailer');

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }
  return raw;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readBody(req);

  if (String(body.secret || '') !== (process.env.ADMIN_SECRET || 'bb-admin-2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const to = String(body.to || '').trim();
  if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'Invalid recipient email' });

  const link = String(body.link || '').trim();
  if (link.indexOf('https://') !== 0) return res.status(400).json({ error: 'Invalid signing link' });

  const first = (String(body.first || 'there').trim().slice(0, 80)) || 'there';
  const bn = (String(body.bn || 'your business').trim().slice(0, 160)) || 'your business';

  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  if (!user || !pass) return res.status(500).json({ error: 'Email service not configured' });
  const fromAddress = process.env.GMAIL_FROM || 'sales@bauersbrew.com';

  const subject = 'Approved — Your Bauer’s Brew Wholesale Agreement';
  const text =
    'Hi ' + first + ',\n\n' +
    'Great news — your wholesale application for ' + bn + ' has been approved!\n\n' +
    'Your next step is to review and sign the Wholesale Agreement using your personal link:\n\n' +
    link + '\n\n' +
    'Review the terms, sign, and submit — you’ll get instant confirmation and can save a PDF copy for your records. ' +
    'We’ll follow up right after with everything you need to place your first order.\n\n' +
    'Questions? Just reply to this email.\n\n' +
    'Mike Bauer\nBauer’s Brew Co. LLC\nsales@bauersbrew.com';

  const html =
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:15px;line-height:1.6;color:#111;max-width:560px;">' +
    '<p>Hi ' + escapeHtml(first) + ',</p>' +
    '<p>Great news — your wholesale application for <strong>' + escapeHtml(bn) + '</strong> has been approved!</p>' +
    '<p>Review and sign your Wholesale Agreement here:</p>' +
    '<p style="margin:22px 0;"><a href="' + escapeAttr(link) + '" style="background:#E8B63B;color:#111;font-weight:bold;text-decoration:none;padding:13px 26px;letter-spacing:.03em;">Review &amp; Sign the Agreement</a></p>' +
    '<p style="font-size:12px;color:#555;word-break:break-all;">Or paste this link into your browser:<br>' + escapeHtml(link) + '</p>' +
    '<p>Sign and submit — you’ll get instant confirmation and can save a PDF copy. We’ll follow up right after with everything you need to place your first order.</p>' +
    '<p style="margin-top:22px;">Warmly,<br>Mike Bauer<br>Bauer’s Brew Co. LLC<br>' +
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
      from: '"Mike Bauer — Bauer\'s Brew" <' + fromAddress + '>',
      to,
      replyTo: fromAddress,
      subject,
      text,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-agreement: failed', err && err.message ? err.message : err);
    return res.status(502).json({ error: 'Could not send the agreement email' });
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '%22');
}
