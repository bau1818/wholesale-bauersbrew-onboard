// Vercel serverless function — emails an internal notification to the team
// (e.g. "new application", "someone signed") via Gmail SMTP.
//
// This replaces the old Formspree notifications. It reuses the same Gmail
// credentials already configured for /api/send-catalog:
//   GMAIL_USER, GMAIL_APP_PASSWORD  (and optional GMAIL_FROM, NOTIFY_TO)
//
// Body: { subject: string, fields: { [label]: value }, signature?: dataURL }
// If `signature` is a data:image/... URL it is attached as signature.png
// (used only as a safety net if the database store failed at signing time).

const nodemailer = require('nodemailer');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
  });
}

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }
  return raw;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readBody(req);
  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  if (!user || !pass) {
    console.error('notify: GMAIL_USER / GMAIL_APP_PASSWORD not configured');
    return res.status(500).json({ error: 'Notifications not configured' });
  }

  const to = process.env.NOTIFY_TO || 'mike@bauersbrew.com';
  const fromAddress = process.env.GMAIL_FROM || 'sales@bauersbrew.com';
  const subject = String(body.subject || "Bauer's Brew — Notification").slice(0, 250);
  const fields = body.fields && typeof body.fields === 'object' ? body.fields : {};

  let text = '';
  let rows = '';
  Object.keys(fields).forEach(function (k) {
    const v = fields[k] == null ? '' : String(fields[k]);
    text += k + ': ' + v + '\n';
    rows +=
      '<tr><td style="padding:5px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;color:#7A7060;white-space:nowrap;vertical-align:top;">' +
      esc(k) +
      '</td><td style="padding:5px 12px;border-bottom:1px solid #eee;font-size:14px;color:#111;">' +
      esc(v).replace(/\n/g, '<br>') +
      '</td></tr>';
  });

  const html =
    '<div style="font-family:Georgia,serif;color:#111;">' +
    '<h2 style="font-size:16px;border-bottom:2px solid #E8B63B;padding-bottom:6px;">' +
    esc(subject) +
    '</h2><table style="border-collapse:collapse;width:100%;max-width:640px;">' +
    rows +
    '</table></div>';

  const attachments = [];
  const sig = body.signature;
  if (typeof sig === 'string' && sig.indexOf('data:image/') === 0) {
    attachments.push({ filename: 'signature.png', path: sig });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: '"Bauer\'s Brew Wholesale" <' + fromAddress + '>',
      to,
      replyTo: fromAddress,
      subject,
      text,
      html,
      attachments,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('notify: failed', err && err.message ? err.message : err);
    return res.status(502).json({ error: 'Could not send notification' });
  }
};
