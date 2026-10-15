import { rows, api } from '@/lib/backend';
import { uuid } from '@/lib/validation.mjs';
import type { Material } from '@/lib/types';
export async function GET(_: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { try {
    const { id } = await params;
    uuid(id);
    const [m] = await rows<Material>('materials', `select=*&id=eq.${id}`);
    if (!m?.storage_path)
        return new Response('Not found', { status: 404 });
    const data = await api('/storage/v1/object/sign/research-materials/' + m.storage_path, { method: 'POST', body: JSON.stringify({ expiresIn: 60 }) });
    const signed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1' + data.signedURL);
    signed.searchParams.set('download', m.name.replace(/[^a-zA-Z0-9._ -]/g, '_'));
    return new Response(null, { status: 303, headers: { Location: signed.toString(), 'Cache-Control': 'private, no-store' } });
}
catch {
    return new Response('File unavailable or access denied', { status: 404 });
} }
