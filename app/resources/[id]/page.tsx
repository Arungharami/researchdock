import Link from 'next/link';
import { PresentationPreview } from '@/components/previews';
import { notFound } from 'next/navigation';
import { rows, user } from '@/lib/backend';
import { Heading, Card } from '@/components/ui';
import { ActionForm, Field } from '@/components/form';
import { bookmark, report } from '@/app/actions';
import type { Resource, Material } from '@/lib/types';
import { uuid } from '@/lib/validation.mjs';
export default async function ResourcePage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; try {
    uuid(id);
}
catch {
    notFound();
} const [r] = await rows<Resource>('resources', `select=*&id=eq.${id}`); if (!r)
    notFound(); const u = await user(); const materials = await rows<Material>('materials', `select=*&resource_id=eq.${id}`); const related = await rows<Resource>('resources', `select=*&status=eq.approved&visibility=eq.public&topic=eq.${encodeURIComponent(r.topic)}&id=neq.${id}&limit=3`); return <div className="container"><Link className="text-link" href="/explore">← Back to the library</Link><Heading eyebrow={r.resource_type + ' · ' + r.status + ' · ' + r.visibility} title={r.title}>{r.authors}</Heading><div className="toolbar"><Link href={'/researchers/' + r.owner_id}>Contributor profile ↗</Link><a className="button secondary" href={'/resources/' + id + '/citation'}>Export BibTeX ↓</a>{u?.id === r.owner_id && r.status !== 'submitted' && <Link className="button" href={'/resources/' + id + '/edit'}>Edit package →</Link>}</div>{r.status !== 'approved' && <p className="notice">Private preview · This resource is not published in public search. {r.review_reason}</p>}<div className="detail-grid"><div><section className="panel"><h2>Abstract</h2><p className="preserve">{r.abstract}</p><div className="tags">{r.keywords.split(',').filter(Boolean).map(k => <span key={k}>{k.trim()}</span>)}</div></section><section className="panel"><h2>The complete research package</h2><p className="muted">Files are delivered as downloads. External media and slide decks open on their original hosts. No malware scanning is claimed.</p>{materials.length ? materials.map(m => <article className="material" key={m.id}><span className="category-icon">{m.kind === 'Presentation' ? '▤' : m.kind === 'Dataset' ? '▦' : '↗'}</span><div><h3>{m.name}</h3><p className="muted">{m.kind}</p>{m.url && <a href={m.url} target="_blank" rel="noopener noreferrer">Open external resource ↗</a>}{m.url && m.kind === 'Presentation' && <PresentationPreview url={m.url} title={m.name}/>}{m.storage_path && <a href={'/materials/' + m.id}>Download file ↓</a>}</div></article>) : <p>No connected materials yet.</p>}</section>{u && <section className="panel"><h3>Report a concern</h3><ActionForm action={report} label="Send report"><input type="hidden" name="id" value={id}/><Field name="reason" label="Describe the ownership, accuracy or content concern" type="textarea" required minLength={10} maxLength={3000}/></ActionForm></section>}</div><aside><section className="panel"><h3>Resource details</h3><dl><dt>Topic</dt><dd>{r.topic}</dd><dt>Date</dt><dd>{r.publication_date}</dd><dt>License / terms</dt><dd>{r.license}</dd><dt>DOI</dt><dd>{r.doi ? <a href={'https://doi.org/' + r.doi}>{r.doi} ↗</a> : 'Not supplied'}</dd></dl>{r.source_url && <p><a href={r.source_url} target="_blank" rel="noopener noreferrer">Original source ↗</a></p>}{r.project_id && <p><Link href={'/projects/' + r.project_id}>Related project →</Link></p>}<p className="muted">Platform approval checks sharing and submission guidelines. It is not scholarly peer review.</p>{u ? <ActionForm action={bookmark} label="Bookmark resource"><input type="hidden" name="id" value={id}/></ActionForm> : <Link href="/auth">Sign in to bookmark</Link>}</section></aside></div>{related.length > 0 && <section><h2>More in {r.topic}</h2><div className="resource-grid">{related.map(item => <Card key={item.id} r={item}/>)}</div></section>}</div>; }
