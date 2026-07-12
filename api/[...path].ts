const CPANEL_API = process.env.CPANEL_API_URL || 'https://smug.site.gracelandroyalacademy.com.ng/api';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-School-ID');
    res.setHeader('Access-Control-Max-Age', '3600');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const pathParts = req.query.path;
  const path = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');

  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query)) {
    if (key !== 'path' && val !== undefined) {
      params.set(key, Array.isArray(val) ? val[0] : String(val));
    }
  }
  const qs = params.toString();
  const targetUrl = `${CPANEL_API}/${path}${qs ? '?' + qs : ''}`;

  const headers: Record<string, string> = {};
  for (const h of ['content-type', 'authorization', 'x-school-id', 'accept']) {
    if (req.headers[h]) headers[h] = req.headers[h] as string;
  }

  const fetchOptions: RequestInit = { method: req.method, headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length > 0) {
      fetchOptions.body = Buffer.concat(chunks);
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const body = await response.text();
    return res.status(response.status).send(body);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(502).json({ success: false, message: 'Backend API unreachable' });
  }
}

export const config = { api: { bodyParser: false } };
