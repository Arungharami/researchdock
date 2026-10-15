import { configured, requireUser, rows } from '@/lib/backend';
import { ResourceEditor } from '@/components/editors';
import { Heading } from '@/components/ui';
import type { Project } from '@/lib/types';
export default async function Submit() { if (!configured())
    return <div className="container"><Heading eyebrow="SHARE YOUR WORK" title="Build a complete research package."/><p className="notice">Submission requires a configured backend and a researcher account. No uploads or drafts are simulated in preview mode.</p></div>; const u = await requireUser(); const projects = await rows<Project>('projects', `select=*&owner_id=eq.${u.id}`); return <div className="container narrow"><Heading eyebrow="STEP 1 · METADATA" title="Start with the research.">Save a private draft, attach supporting materials, preview and submit for moderation.</Heading><ResourceEditor projects={projects}/></div>; }
