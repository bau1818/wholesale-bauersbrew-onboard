// Daily keep-alive: pings the Supabase database so the free-tier project
// never pauses for inactivity (which would break the short application /
// signing / record links). Triggered by the Vercel Cron entry in vercel.json.
//
// Uses the public anon key only — no secrets.

const SB_URL = 'https://uxmrumluonnwjxyevdjv.supabase.co';
const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bXJ1bWx1b25ud2p4eWV2ZGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDk2MTIsImV4cCI6MjEwMDkyNTYxMn0.JEBGLcOpNJ9a5gJuqIqx88xHlL4y_bPbBQijG_r9z9Y';

module.exports = async (req, res) => {
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/ping', {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const ok = r.ok;
    return res.status(ok ? 200 : 502).json({ ok, status: r.status });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
