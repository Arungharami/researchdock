import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function config() { if (!configured())
    throw new Error('Backend is not configured. Connect Supabase to enable accounts and submissions.'); return { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }; }
export async function api(path: string, init: RequestInit = {}) { const { url, key } = config(); const token = (await cookies()).get('rd-access')?.value; const res = await fetch(url + path, { ...init, cache: 'no-store', headers: { apikey: key, Authorization: `Bearer ${token || key}`, 'Content-Type': 'application/json', ...init.headers } }); if (!res.ok) {
    let message = 'Backend request failed.';
    try {
        const e = await res.json();
        message = e.message || e.msg || e.error_description || message;
    }
    catch { }
    throw new Error(message);
} if (res.status === 204 || res.headers.get('content-length') === '0')
    return null; const body = await res.text(); return body ? JSON.parse(body) : null; }
export const user = cache(async function user() { if (!configured() || !(await cookies()).get('rd-access'))
    return null; try {
    return await api('/auth/v1/user') as {
        id: string;
        email: string;
    };
}
catch {
    return null;
} });
export async function requireUser() { const u = await user(); if (!u)
    redirect('/auth'); return u; }
export async function rows<T>(table: string, query = 'select=*'): Promise<T[]> { if (!configured())
    return []; return await api(`/rest/v1/${table}?${query}`); }
export async function rpc(name: string, args: Record<string, unknown>) { return api(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) }); }
export async function write(table: string, method: string, data: unknown, query = '') { return api(`/rest/v1/${table}${query ? '?' + query : ''}`, { method, body: JSON.stringify(data), headers: { Prefer: 'return=representation' } }); }
export async function session(data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}) { const jar = await cookies(); const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }; jar.set('rd-access', data.access_token, { ...opts, maxAge: data.expires_in }); jar.set('rd-refresh', data.refresh_token, { ...opts, maxAge: 60 * 60 * 24 * 30 }); jar.set('rd-exp', String(Date.now() + data.expires_in * 1000), { ...opts, maxAge: 60 * 60 * 24 * 30 }); }
