import Link from 'next/link';
import { ActionForm, Field } from '@/components/form';
import { authenticate } from '@/app/actions';
import { configured } from '@/lib/backend';
import { Heading } from '@/components/ui';
export default async function Auth({ searchParams }: {
    searchParams: Promise<{
        mode?: string;
    }>;
}) { const rawMode = (await searchParams).mode; const register = (Array.isArray(rawMode) ? rawMode[0] : rawMode) === 'register'; return <div className="container narrow"><Heading eyebrow="YOUR RESEARCH WORKSPACE" title={register ? 'Start your next chapter.' : 'Welcome back.'}>One account for your projects, research packages and saved discoveries.</Heading>{configured() ? <ActionForm action={authenticate} label={register ? 'Create account' : 'Sign in'}><input type="hidden" name="mode" value={register ? 'register' : 'login'}/>{register && <Field name="name" label="Full name" required minLength={2} maxLength={100}/>}<Field name="email" label="Email address" type="email" required/><Field name="password" label="Password (at least 10 characters)" type="password" required minLength={10} maxLength={128}/>{register && <p className="muted">By creating an account you agree to our <Link href="/policies">submission and privacy policies</Link>. You may need to confirm your email before signing in.</p>}</ActionForm> : <div className="notice">Accounts are unavailable until the project operator configures Supabase. This preview does not simulate a successful login.</div>}<p><Link className="text-link" href={register ? '/auth' : '/auth?mode=register'}>{register ? 'Already have an account? Sign in →' : 'New here? Create an account →'}</Link></p></div>; }
