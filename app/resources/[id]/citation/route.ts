import { rows } from '@/lib/backend';
import { uuid, bibtex } from '@/lib/validation.mjs';
import type { Resource } from '@/lib/types';
export async function GET(_: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { try {
    const { id } = await params;
    uuid(id);
    const [r] = await rows<Resource>('resources', `select=*&id=eq.${id}`);
    if (!r)
        return new Response('Not found', { status: 404 });
    return new Response(bibtex(r), { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8', 'Content-Disposition': `attachment; filename="researchdock-${id}.bib"`, 'Cache-Control': 'private, no-store' } });
}
catch {
    return new Response('Unavailable', { status: 404 });
} }
