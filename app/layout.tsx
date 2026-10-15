import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { configured, user } from '@/lib/backend';
import { signOut } from './actions';
export const metadata: Metadata = { title: { default: 'ResearchDock — Digital Research & Collaboration Center', template: '%s | ResearchDock' }, description: 'Where research becomes shared knowledge. Discover and share complete research packages.' };
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: {
    children: React.ReactNode;
}) { const u = await user(); return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><header className="header"><Link className="brand" href="/"><span className="brand-icon">R<span>↗</span></span>Research<span>Dock</span></Link><nav aria-label="Main navigation"><Link href="/explore">Explore</Link><Link href="/about">About</Link><Link href="/dashboard">Workspace</Link></nav><div className="account">{u ? <form action={signOut}><button className="quiet">Sign out</button></form> : <Link href="/auth">Sign in</Link>}<Link className="button small" href={u ? '/submit' : '/auth?mode=register'}>{u ? 'Share research' : 'Join ResearchDock'} <span aria-hidden>↗</span></Link></div></header>{!configured() && <div className="setup-banner">Setup preview · Supabase is not connected. Browsing the interface is available; accounts, uploads and publishing require backend setup.</div>}<main id="main">{children}</main><footer><div><Link className="brand" href="/">ResearchDock<span>↗</span></Link><p>Where research becomes shared knowledge.</p></div><div><Link href="/policies">Guidelines & policies</Link><Link href="/about">About the platform</Link><a href="https://github.com/Arungharami/researchdock">GitHub ↗</a><p>Created by Arun Kumar Gharami.<br />An independent research platform.</p></div></footer></body></html>; }
