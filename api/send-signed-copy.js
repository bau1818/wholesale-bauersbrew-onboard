// Vercel serverless function — emails a client their own signed-agreement copy
// after they sign. Triggered (best-effort) by the agreement page.
//
// Security: takes only { code }. The recipient is looked up from the database
// (the email on that record) — the caller cannot specify an arbitrary address,
// so this can't be used as an open relay.
//
// Env: GMAIL_USER, GMAIL_APP_PASSWORD (+ optional GMAIL_FROM)

const nodemailer = require('nodemailer');

const SB_URL = 'https://uxmrumluonnwjxyevdjv.supabase.co';
const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bXJ1bWx1b25ud2p4eWV2ZGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDk2MTIsImV4cCI6MjEwMDkyNTYxMn0.JEBGLcOpNJ9a5gJuqIqx88xHlL4y_bPbBQijG_r9z9Y';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch (e) { return {}; } }
  return raw;
}
function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readBody(req);
  const code = String(body.code || '').trim();
  if (!/^[a-z0-9]{4,16}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });

  let rec = null;
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/get_signed', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (r.ok) rec = await r.json();
  } catch (e) { /* fall through */ }

  if (!rec || !rec.data) return res.status(404).json({ error: 'Record not found' });

  const to = String(rec.data.em || '').trim();
  // No valid client email on file — nothing to send, but don't error the sign flow.
  if (!EMAIL_RE.test(to)) return res.status(200).json({ ok: false, skipped: 'no client email' });

  const bn = String(rec.data.bn || 'your business');
  const first = (String(rec.data.rep || 'there').split(' ')[0]) || 'there';
  const link = 'https://wholesale.bauersbrew.com/record?id=' + encodeURIComponent(code);

  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  if (!user || !pass) return res.status(500).json({ error: 'Email not configured' });
  const fromAddress = process.env.GMAIL_FROM || 'sales@bauersbrew.com';

  const subject = 'Your Signed Bauer’s Brew Wholesale Agreement';
  const text =
    'Hi ' + first + ',\n\n' +
    'Thank you — your wholesale agreement for ' + bn + ' is signed and your account is open. 🎉\n\n' +
    'Here is your copy for your records:\n' + link + '\n\n' +
    'Open it any time and use "Download / Print PDF" to save it.\n\n' +
    'We’ll follow up shortly with everything you need to place your first order. ' +
    'Questions? Just reply to this email.\n\n' +
    'Warmly,\nMike Bauer\nBauer’s Brew Co. LLC\nsales@bauersbrew.com';
  const html =
    '<div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#111;max-width:560px;">' +
    '<p>Hi ' + esc(first) + ',</p>' +
    '<p>Thank you — your wholesale agreement for <strong>' + esc(bn) + '</strong> is signed and your account is open. 🎉</p>' +
    '<p>Here is your copy for your records:</p>' +
    '<p style="margin:20px 0;"><a href="' + link.replace(/"/g, '%22') + '" style="background:#E8B63B;color:#111;font-weight:bold;text-decoration:none;padding:12px 24px;">View / Download Your Signed Agreement</a></p>' +
    '<p style="font-size:12px;color:#555;">Open it and use “Download / Print PDF” to save it.</p>' +
    '<p>We’ll follow up shortly with everything you need to place your first order.</p>' +
    '<p style="margin-top:22px;">Warmly,<br>Mike Bauer<br>Bauer’s Brew Co. LLC<br>' +
    '<a href="mailto:sales@bauersbrew.com" style="color:#C99D28;">sales@bauersbrew.com</a></p></div>';

  try {
    const transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    await transporter.sendMail({
      from: '"Bauer\'s Brew Wholesale" <' + fromAddress + '>',
      to, replyTo: fromAddress, subject, text, html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-signed-copy: failed', err && err.message ? err.message : err);
    return res.status(502).json({ error: 'Could not send signed copy' });
  }
};
