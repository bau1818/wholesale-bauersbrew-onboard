// Vercel Edge Middleware — password-protects INTERNAL pages only.
// Public workflow pages (application, agreement, thanks, signed, terms,
// signature image) are NOT listed here and stay open for clients.
//
// Uses a branded cookie-based login page (not the browser Basic Auth popup,
// which Vercel's header handling makes unreliable).
export const config = {
  matcher: ['/approve', '/approve.html', '/preview', '/preview.html', '/accounts', '/accounts.html'],
};

const PASSWORD = 'C0dycawfee!';
const COOKIE = 'bb_gate';
const TOKEN = 'bbwholesale-ok-2026'; // opaque session marker (not the password)

function loginPage(pathname, wrong) {
  const err = wrong
    ? '<p class="err">Incorrect password. Try again.</p>'
    : '';
  return new Response(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Bauer's Brew — Internal Access</title>
<link href="https://fonts.googleapis.com/css2?family=Besley:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#EAE6DC;font-family:'Besley',Georgia,serif;color:#111;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
.card{max-width:380px;width:100%;background:#fff;border:1px solid #DDD8CC;text-align:center;}
.top{background:#111;border-bottom:3px solid #E8B63B;padding:26px 24px;}
.top .kick{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#E8B63B;margin-bottom:8px;}
.top h1{font-weight:900;font-size:18px;letter-spacing:.05em;text-transform:uppercase;color:#fff;line-height:1.25;}
.bd{padding:26px 26px 30px;}
.bd p.lead{font-size:13.5px;color:#444;margin-bottom:18px;line-height:1.5;}
input[type=password]{width:100%;font-family:'Besley',serif;font-size:16px;padding:12px 13px;border:1px solid #DDD8CC;background:#F9F7F2;margin-bottom:12px;}
input[type=password]:focus{outline:none;border-color:#E8B63B;box-shadow:0 0 0 3px rgba(232,182,59,.18);background:#fff;}
button{width:100%;font-family:'Besley',serif;font-weight:900;font-size:15px;letter-spacing:.05em;text-transform:uppercase;background:#E8B63B;color:#111;border:none;padding:13px;cursor:pointer;transition:background .15s;}
button:hover{background:#C99D28;}
.err{color:#b42318;font-family:'Space Mono',monospace;font-size:11px;margin-bottom:12px;}
.foot{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.06em;color:#7A7060;text-transform:uppercase;margin-top:18px;}
</style></head><body>
<div class="card">
<div class="top"><div class="kick">Bauer's Brew · Internal</div><h1>Staff Access</h1></div>
<div class="bd">
<p class="lead">This is an internal page. Enter the access password to continue.</p>
${err}
<form method="POST" action="${pathname}">
<input type="password" name="pw" placeholder="Password" autofocus autocomplete="current-password">
<button type="submit">Enter</button>
</form>
<div class="foot">Bauer's Brew Co. LLC · Authorized use only</div>
</div>
</div>
</body></html>`, {
    status: wrong ? 401 : 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';

  // Already logged in
  if (cookie.split(';').some(c => c.trim() === `${COOKIE}=${TOKEN}`)) {
    return; // allow the page to load
  }

  // Login form submitted
  if (request.method === 'POST') {
    let pw = '';
    try {
      const form = await request.formData();
      pw = form.get('pw') || '';
    } catch (e) { pw = ''; }
    if (pw === PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: {
          'Set-Cookie': `${COOKIE}=${TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
          'Location': url.pathname,
        },
      });
    }
    return loginPage(url.pathname, true); // wrong password
  }

  // Not logged in → show the login page
  return loginPage(url.pathname, false);
}
