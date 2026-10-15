import Link from 'next/link';
import type { Resource } from '@/lib/types';
export function Card({ r }: {
    r: Resource;
}) { return <article className="resource-card"><div className="card-top"><span className="type">{r.resource_type}</span><span>{r.publication_date.slice(0, 4)}</span></div><h3><Link href={'/resources/' + r.id}>{r.title}</Link></h3><p className="authors">{r.authors}</p><p className="clamp">{r.abstract}</p><div className="card-bottom"><span>{r.topic}</span><span>↗</span></div></article>; }
export function Empty({ title = 'Your next discovery starts here.', description = 'No resources match yet. Try another search or share your first research package.' }: {
    title?: string;
    description?: string;
}) { return <div className="empty"><span className="empty-icon">⌕</span><h3>{title}</h3><p>{description}</p><Link className="text-link" href="/submit">Create a research package →</Link></div>; }
export function Heading({ eyebrow, title, children }: {
    eyebrow: string;
    title: string;
    children?: React.ReactNode;
}) { return <div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="lead">{children}</p>}</div>; }
export function Search({ q = '' }: {
    q?: string;
}) { return <form className="search" action="/explore"><label className="sr-only" htmlFor="search">Search research</label><span aria-hidden>⌕</span><input id="search" name="q" defaultValue={q} maxLength={200} placeholder="Search papers, projects, datasets…"/><button className="button">Search <span aria-hidden>→</span></button></form>; }
