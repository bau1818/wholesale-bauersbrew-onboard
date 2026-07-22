// Vercel Edge Middleware — password-protects INTERNAL pages only.
// Public workflow pages (application, agreement, thanks, signed, terms,
// signature image) are NOT listed here and stay open for clients.
export const config = {
  matcher: ['/approve', '/approve.html', '/preview', '/preview.html'],
};

const PASSWORD = 'C0dycawfee!';

export default function middleware(request) {
  const auth = request.headers.get('authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      let decoded = '';
      try { decoded = atob(encoded); } catch (e) { decoded = ''; }
      const sep = decoded.indexOf(':');
      const pass = sep === -1 ? '' : decoded.slice(sep + 1);
      if (pass === PASSWORD) {
        return; // correct password — let the page load
      }
    }
  }
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Bauer\'s Brew — Internal", charset="UTF-8"',
    },
  });
}
