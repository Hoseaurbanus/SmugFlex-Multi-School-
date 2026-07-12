export const config = { runtime: 'edge' };

const CPANEL_API = 'https://smug.site.gracelandroyalacademy.com.ng/api';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, X-School-ID',
        'Access-Control-Max-Age': '3600',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\//, '');
  const targetUrl = CPANEL_API + '/' + path + url.search;

  const fwdHeaders = new Headers();
  for (const h of ['content-type', 'authorization', 'x-school-id', 'accept']) {
    const v = req.headers.get(h);
    if (v) fwdHeaders.set(h, v);
  }

  try {
    const resp = await fetch(targetUrl, {
      method: req.method,
      headers: fwdHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: 'Backend API unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
