const CPANEL_HOST = process.env.CPANEL_HOST || 'https://smug.site.gracelandroyalacademy.com.ng';

const ALLOWED_ORIGINS = [
  'https://smug.site.gracelandroyalacademy.com.ng',
  'https://smug-flex-multi-school-o3to.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export const config = {
  matcher: ['/api/:path*'],
};

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const origin = request.headers.get('Origin');

  // Handle OPTIONS preflight at the edge — never forward to cPanel
  if (method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, X-School-ID, Cache-Control, Pragma, X-CSRF-Token',
      'Access-Control-Max-Age': '86400',
    };
    if (isAllowedOrigin(origin)) {
      headers['Access-Control-Allow-Origin'] = origin!;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    return new Response(null, { status: 204, headers });
  }

  // Build target URL on cPanel — preserve path + query string
  const targetUrl = CPANEL_HOST + url.pathname + url.search;

  // Forward relevant headers
  const headers = new Headers();
  for (const h of ['content-type', 'authorization', 'x-school-id', 'accept', 'x-csrf-token']) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }

  // Read request body for POST / PUT / PATCH
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
    if (isAllowedOrigin(origin)) {
      respHeaders.set('Access-Control-Allow-Origin', origin!);
      respHeaders.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch {
    const errorHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isAllowedOrigin(origin)) {
      errorHeaders['Access-Control-Allow-Origin'] = origin!;
    }
    return new Response(
      JSON.stringify({ success: false, message: 'Backend API unreachable' }),
      { status: 502, headers: errorHeaders }
    );
  }
}
