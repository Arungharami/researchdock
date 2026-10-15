import { configured, requireUser } from '@/lib/backend';
import { ProjectEditor } from '@/components/editors';
import { Heading } from '@/components/ui';
export default async function NewProject() { if (!configured())
    return <div className="container"><p className="notice">Connect Supabase to create a project.</p></div>; await requireUser(); return <div className="container narrow"><Heading eyebrow="NEW WORKSPACE" title="Make room for your next idea."/><ProjectEditor /></div>; }
