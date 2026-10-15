import Link from 'next/link';
import { notFound } from 'next/navigation';
import { rows, requireUser } from '@/lib/backend';
import { ResourceEditor } from '@/components/editors';
import { ActionForm, Field } from '@/components/form';
import { attach, transition, removeMaterial } from '@/app/actions';
import { Heading } from '@/components/ui';
import type { Resource, Project, Material } from '@/lib/types';
import { uuid } from '@/lib/validation.mjs';
export default async function Edit({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const u = await requireUser(); const { id } = await params; try {
    uuid(id);
}
catch {
    notFound();
} const [r] = await rows<Resource>('resources', `select=*&id=eq.${id}&owner_id=eq.${u.id}`); if (!r)
    notFound(); const projects = await rows<Project>('projects', `select=*&owner_id=eq.${u.id}`); const materials = await rows<Material>('materials', `select=*&resource_id=eq.${id}`); const editable = ['draft', 'rejected'].includes(r.status); return <div className="container narrow"><Heading eyebrow={'RESEARCH PACKAGE · ' + r.status} title={r.title}>Metadata → materials → preview → submit</Heading><p className="toolbar"><Link href={'/resources/' + id} className="button secondary">Preview resource ↗</Link></p>{r.review_reason && <p className="notice">Reviewer feedback: {r.review_reason}</p>}{editable ? <><section className="panel"><h2>Attach supporting materials</h2><p>PDF, PPTX, CSV or TXT up to 3 MB. Link large datasets, code, notebooks and videos using HTTPS. Uploaded files are not scanned for malware.</p><ActionForm action={attach} label="Attach material"><input type="hidden" name="id" value={id}/><Field name="name" label="Material name" required maxLength={200}/><label>Material type<select name="kind">{['Presentation', 'Paper', 'Dataset', 'Code or notebook', 'Video demonstration', 'Poster', 'Supporting resource'].map(t => <option key={t}>{t}</option>)}</select></label><Field name="url" label="External HTTPS link (optional)" type="url"/><label>File (optional)<input type="file" name="file" accept=".pdf,.pptx,.csv,.txt"/></label></ActionForm></section><section className="panel"><h2>Connected materials</h2>{materials.length ? materials.map(m => <div className="list-row" key={m.id}><span>{m.kind}: {m.name}</span><ActionForm action={removeMaterial} label="Remove material"><input type="hidden" name="id" value={m.id}/><input type="hidden" name="resource_id" value={id}/></ActionForm></div>) : <p>No materials attached yet. Add a file, link, or original source URL before submitting.</p>}<ActionForm action={transition} label="Submit for moderation"><input type="hidden" name="id" value={id}/><input type="hidden" name="decision" value="submit"/><p>Submission freezes the package until review. Approval is platform moderation, never scholarly peer review. Public visibility requires approval.</p></ActionForm></section><details className="panel"><summary>Edit metadata & visibility</summary><ResourceEditor r={r} projects={projects}/></details></> : r.status === 'approved' ? <section className="panel"><p>Editing this approved package withdraws it from public search and creates a private draft for re-review.</p><ActionForm action={transition} label="Withdraw approval & edit"><input type="hidden" name="id" value={id}/><input type="hidden" name="decision" value="draft"/></ActionForm></section> : <section className="panel"><p>Your package is awaiting moderation. Withdraw it to continue editing.</p><ActionForm action={transition} label="Withdraw submission"><input type="hidden" name="id" value={id}/><input type="hidden" name="decision" value="draft"/></ActionForm></section>}</div>; }
