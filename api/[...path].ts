const CPANEL_API = process.env.CPANEL_API_URL || 'https://smug.site.gracelandroyalacademy.com.ng/api';

export default async function handler(req: any, res: any) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-School-ID');
    res.setHeader('Access-Control-Max-Age', '3600');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const pathParts = req.query.path;
    const path = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');

    // Build query string (exclude 'path' from params)
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(req.query)) {
      if (key !== 'path' && val !== undefined) {
        params.set(key, Array.isArray(val) ? val[0] : String(val));
      }
    }
    const qs = params.toString();
    const targetUrl = CPANEL_API + '/' + path + (qs ? '?' + qs : '');

    // Forward relevant headers
    const fwdHeaders: Record<string, string> = {};
    if (req.headers['content-type']) fwdHeaders['Content-Type'] = req.headers['content-type'];
    if (req.headers['authorization']) fwdHeaders['Authorization'] = req.headers['authorization'];
    if (req.headers['x-school-id']) fwdHeaders['X-School-ID'] = req.headers['x-school-id'];
    if (req.headers['accept']) fwdHeaders['Accept'] = req.headers['accept'];

    const fetchOpts: any = { method: req.method, headers: fwdHeaders };

    // Forward body for write methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        fetchOpts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }

    const resp = await fetch(targetUrl, fetchOpts);
    const ct = resp.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const body = await resp.text();
    return res.status(resp.status).send(body);
  } catch (err: any) {
    console.error('Proxy error:', err.message || err);
    return res.status(502).json({ success: false, message: 'Backend API unreachable' });
  }
}

export const config = { api: { bodyParser: true } };
