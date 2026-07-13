const CPANEL_HOST = 'https://smug.site.gracelandroyalacademy.com.ng';

export const config = {
  matcher: ['/api/:path*'],
};

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  // Handle OPTIONS preflight at the edge — never forward to cPanel
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, X-School-ID, Cache-Control, Pragma',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Build target URL on cPanel — preserve path + query string
  const targetUrl = CPANEL_HOST + url.pathname + url.search;

  // Forward relevant headers
  const headers = new Headers();
  for (const h of ['content-type', 'authorization', 'x-school-id', 'accept']) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }

  // Read request body for POST / PUT / PATCH (reads stream into text so fetch can forward it)
  let body: string | undefined = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {}
  }

  // Proxy the request to cPanel
  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: body || undefined,
    });

    const respHeaders = new Headers(upstream.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    respHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-School-ID, Cache-Control, Pragma');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: 'Backend API unreachable' }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
