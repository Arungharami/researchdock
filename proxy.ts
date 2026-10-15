import { NextRequest, NextResponse } from 'next/server';
export async function proxy(req: NextRequest) {
    const response = NextResponse.next();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const refresh = req.cookies.get('rd-refresh')?.value;
    const exp = Number(req.cookies.get('rd-exp')?.value || 0);
    if (!url || !key || !refresh || exp > Date.now() + 60000)
        return response;
    const res = await fetch(url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }), cache: 'no-store' }).catch(() => null);
    if (!res?.ok)
        return response;
    const data = await res.json();
    const values: Record<string, string> = { 'rd-access': data.access_token, 'rd-refresh': data.refresh_token, 'rd-exp': String(Date.now() + data.expires_in * 1000) };
    for (const [name, value] of Object.entries(values))
        req.cookies.set(name, value);
    const next = NextResponse.next({ request: { headers: req.headers } });
    for (const [name, value] of Object.entries(values))
        next.cookies.set(name, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: name === 'rd-access' ? data.expires_in : 2592000 });
    return next;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
