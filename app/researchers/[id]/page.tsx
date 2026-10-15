import { notFound } from 'next/navigation';
import { rows } from '@/lib/backend';
import { Heading, Card, Empty } from '@/components/ui';
import type { Profile, Resource } from '@/lib/types';
import { uuid } from '@/lib/validation.mjs';
export default async function Researcher({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; try {
    uuid(id);
}
catch {
    notFound();
} const [p] = await rows<Profile>('profiles', `select=*&id=eq.${id}`); if (!p)
    notFound(); const resources = await rows<Resource>('resources', `select=*&owner_id=eq.${id}&status=eq.approved&visibility=eq.public`); return <div className="container"><Heading eyebrow="RESEARCHER PROFILE" title={p.name || 'Researcher'}>{p.bio || 'This researcher has not added a biography yet.'}</Heading><div className="panel"><p><strong>Research interests:</strong> {p.interests || 'Not provided'}</p><p><strong>Affiliation:</strong> {p.affiliation || 'Not provided'} <span className="muted">(self-reported)</span></p></div><h2>Published on ResearchDock</h2><p className="muted">Platform approval is content moderation, not scholarly peer review.</p>{resources.length ? <div className="resource-grid">{resources.map(r => <Card key={r.id} r={r}/>)}</div> : <Empty title="No public research packages yet."/>}</div>; }
