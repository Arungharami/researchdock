"use server";
import { redirect, unstable_rethrow } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { api, requireUser, rpc, write, session, config, rows } from '@/lib/backend';
import { safeUrl, text, uuid, validateFile } from '@/lib/validation.mjs';
import { resourceTypes, topics, type Resource } from '@/lib/types';
export type Result = {
    error?: string;
    success?: string;
};
const val = (f: FormData, k: string, min = 0, max = 20000) => text(f.get(k), min, max);
const id = (f: FormData, k = 'id') => uuid(val(f, k));
export async function authenticate(_: Result, f: FormData): Promise<Result> { let destination = '/dashboard'; try {
    const mode = val(f, 'mode');
    const email = val(f, 'email', 3, 254);
    const password = val(f, 'password', 10, 128);
    const data = await api(mode === 'register' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password, data: mode === 'register' ? { name: val(f, 'name', 2, 100) } : undefined }) });
    if (data.access_token)
        await session(data);
    else
        return { success: 'Check your email to confirm your account, then sign in.' };
    destination = '/dashboard';
}
catch (e) {
    return { error: e instanceof Error ? e.message : 'Authentication failed.' };
} redirect(destination); }
export async function signOut() { try {
    await api('/auth/v1/logout', { method: 'POST' });
}
catch { } const c = await cookies(); for (const k of ['rd-access', 'rd-refresh', 'rd-exp'])
    c.delete(k); redirect('/'); }
export async function saveProfile(_: Result, f: FormData): Promise<Result> { try {
    const u = await requireUser();
    await write('profiles', 'PATCH', { name: val(f, 'name', 2, 100), bio: val(f, 'bio', 0, 3000), interests: val(f, 'interests', 0, 500), affiliation: val(f, 'affiliation', 0, 200) }, `id=eq.${u.id}`);
    revalidatePath('/dashboard');
    return { success: 'Profile updated.' };
}
catch (e) {
    return fail(e);
} }
export async function saveProject(_: Result, f: FormData): Promise<Result> { let target = ''; try {
    const u = await requireUser();
    const record = { title: val(f, 'title', 3, 200), overview: val(f, 'overview', 20, 10000), methodology: val(f, 'methodology'), team: val(f, 'team', 0, 3000), milestones: val(f, 'milestones', 0, 5000), updates: val(f, 'updates', 0, 10000), visibility: val(f, 'visibility') === 'public' ? 'public' : 'private' };
    const existing = val(f, 'id');
    const result = await write('projects', existing ? 'PATCH' : 'POST', existing ? record : { ...record, owner_id: u.id }, existing ? `id=eq.${uuid(existing)}&owner_id=eq.${u.id}` : '');
    if (!result?.[0])
        throw new Error('Project not found or access denied.');
    target = '/projects/' + result[0].id;
}
catch (e) {
    return fail(e);
} redirect(target); }
export async function saveResource(_: Result, f: FormData): Promise<Result> { let target = ''; try {
    await requireUser();
    const type = val(f, 'resource_type'), topic = val(f, 'topic');
    if (!resourceTypes.includes(type as typeof resourceTypes[number]) || !topics.includes(topic as typeof topics[number]))
        throw new Error('Choose a valid type and topic.');
    const date = val(f, 'publication_date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
        throw new Error('Choose a valid date.');
    const doi = val(f, 'doi', 0, 200);
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi))
        throw new Error('Enter a DOI beginning with 10., or leave it blank.');
    const data = { title: val(f, 'title', 5, 300), abstract: val(f, 'abstract', 30, 20000), authors: val(f, 'authors', 2, 2000), topic, resource_type: type, keywords: val(f, 'keywords', 0, 1000), publication_date: date, source_url: safeUrl(val(f, 'source_url', 0, 2000)), doi, license: val(f, 'license', 2, 200), project_id: val(f, 'project_id') ? uuid(val(f, 'project_id')) : null, visibility: val(f, 'visibility') === 'public' ? 'public' : 'private', permission_confirmed: f.get('permission_confirmed') === 'on' };
    if (!data.permission_confirmed)
        throw new Error('Confirm your permission to share these materials.');
    const resourceId = await rpc('save_resource', { resource_id: val(f, 'id') ? id(f) : null, payload: data });
    target = '/resources/' + resourceId + '/edit';
}
catch (e) {
    return fail(e);
} redirect(target); }
export async function attach(_: Result, f: FormData): Promise<Result> { try {
    const u = await requireUser();
    const resource = id(f);
    const own = await rows<Resource>('resources', `select=*&id=eq.${resource}&owner_id=eq.${u.id}`);
    if (!own[0] || !['draft', 'rejected'].includes(own[0].status))
        throw new Error('Only your editable drafts can receive materials.');
    const name = val(f, 'name', 2, 200), kind = val(f, 'kind', 2, 100);
    const url = safeUrl(val(f, 'url', 0, 2000));
    const file = f.get('file');
    let path: string | null = null, mime: string | null = null;
    if (file instanceof File && file.size) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const ext = validateFile(file.name, file.type, bytes);
        path = `${u.id}/${resource}/${crypto.randomUUID()}.${ext}`;
        mime = file.type;
        const c = config();
        const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!token)
            throw new Error('File storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY server-side; HTTPS links remain available.');
        const res = await fetch(`${c.url}/storage/v1/object/research-materials/${path}`, { method: 'POST', headers: { apikey: token, Authorization: `Bearer ${token}`, 'Content-Type': mime, 'x-upsert': 'false' }, body: bytes });
        if (!res.ok)
            throw new Error('Storage upload failed. Verify the private bucket configuration.');
    }
    if (!url && !path)
        throw new Error('Choose a file or provide an HTTPS link.');
    try {
        await write('materials', 'POST', { resource_id: resource, name, kind, url: url || null, storage_path: path, mime });
    }
    catch (e) {
        if (path) {
            await api('/storage/v1/object/research-materials', { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) }).catch(() => { });
        }
        throw e;
    }
    revalidatePath('/resources/' + resource);
    return { success: 'Material attached to your draft.' };
}
catch (e) {
    return fail(e);
} }
export async function transition(_: Result, f: FormData): Promise<Result> { try {
    await requireUser();
    await rpc('transition_resource', { resource_id: id(f), decision: val(f, 'decision'), reason: val(f, 'reason', 0, 3000) });
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/moderation');
    revalidatePath('/resources/' + id(f));
    return { success: 'Resource status updated.' };
}
catch (e) {
    return fail(e);
} }
export async function bookmark(_: Result, f: FormData): Promise<Result> { try {
    const u = await requireUser();
    const resource = id(f);
    if (val(f, 'remove') === 'yes')
        await api(`/rest/v1/bookmarks?user_id=eq.${u.id}&resource_id=eq.${resource}`, { method: 'DELETE' });
    else
        await write('bookmarks', 'POST', { user_id: u.id, resource_id: resource });
    revalidatePath('/dashboard');
    return { success: val(f, 'remove') === 'yes' ? 'Bookmark removed.' : 'Resource bookmarked.' };
}
catch (e) {
    return fail(e);
} }
export async function report(_: Result, f: FormData): Promise<Result> { try {
    const u = await requireUser();
    await write('reports', 'POST', { reporter_id: u.id, resource_id: id(f), reason: val(f, 'reason', 10, 3000) });
    return { success: 'Report received for moderation.' };
}
catch (e) {
    return fail(e);
} }
export async function removeMaterial(_: Result, f: FormData): Promise<Result> { try {
    await requireUser();
    const path = await rpc('remove_material', { material_id: id(f) });
    if (path)
        await api('/storage/v1/object/research-materials', { method: 'DELETE', body: JSON.stringify({ prefixes: [path] }) });
    revalidatePath('/resources/' + uuid(val(f, 'resource_id')) + '/edit');
    return { success: 'Material removed.' };
}
catch (e) {
    return fail(e);
} }
export async function assignRole(_: Result, f: FormData): Promise<Result> { try {
    await requireUser();
    await rpc('assign_role', { target_user: uuid(val(f, 'target_user')), new_role: val(f, 'role') });
    return { success: 'Role assignment updated.' };
}
catch (e) {
    return fail(e);
} }
export async function resolveReport(_: Result, f: FormData): Promise<Result> { try {
    await requireUser();
    await rpc('resolve_report', { report_id: id(f), resolution: val(f, 'resolution', 10, 3000) });
    revalidatePath('/moderation');
    return { success: 'Report resolved.' };
}
catch (e) {
    return fail(e);
} }
function fail(e: unknown): Result { unstable_rethrow(e); return { error: e instanceof Error ? e.message : 'The request could not be completed.' }; }
