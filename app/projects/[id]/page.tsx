import { notFound } from 'next/navigation';
import Link from 'next/link';
import { rows, user } from '@/lib/backend';
import { Heading, Card } from '@/components/ui';
import { ProjectEditor } from '@/components/editors';
import type { Project, Resource } from '@/lib/types';
import { uuid } from '@/lib/validation.mjs';
export default async function ProjectPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; try {
    uuid(id);
}
catch {
    notFound();
} const [p] = await rows<Project>('projects', `select=*&id=eq.${id}`); if (!p)
    notFound(); const u = await user(); const resources = await rows<Resource>('resources', `select=*&project_id=eq.${id}`); return <div className="container"><Heading eyebrow={'PROJECT WORKSPACE · ' + p.visibility} title={p.title}>{p.overview}</Heading><div className="detail-grid"><div>{[['Methodology', p.methodology], ['Team', p.team], ['Milestones', p.milestones], ['Updates', p.updates]].map(([t, v]) => <section className="panel" key={t}><h2>{t}</h2><p className="preserve">{v || 'Not provided yet.'}</p></section>)}</div><aside className="panel"><h3>Project resources</h3><p>{resources.length} resources visible to you</p><Link className="text-link" href={'/researchers/' + p.owner_id}>View project owner ↗</Link>{u?.id === p.owner_id && <p><Link href="/submit">Add a resource →</Link></p>}</aside></div><div className="resource-grid">{resources.map(r => <Card key={r.id} r={r}/>)}</div>{u?.id === p.owner_id && <details className="panel"><summary>Edit project workspace</summary><ProjectEditor p={p}/></details>}</div>; }
