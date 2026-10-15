# ResearchDock

**Where research becomes shared knowledge.**

A digital research and collaboration center created by **Arun Kumar Gharami**. ResearchDock connects a searchable academic library to project workspaces and complete research packages. Independent identity; no IEEE, FAU or institutional affiliation is implied.

## Implemented

- Responsive navy, white and teal interface: home, Explore, resource packages, projects, researcher profiles, dashboard, submission editor, moderation, About and policies.
- Supabase email/password accounts, persistent sessions, server-validated identity and HTTP-only cookies with refresh handling.
- Projects with overview, methodology, self-reported team, milestones, updates and visibility.
- Structured resource drafts, metadata editing, associated materials, preview, sharing confirmation, submission, independent moderation and publication.
- Distinct published-paper, preprint, student-project, presentation, poster, dataset, code/notebook, video, tutorial and technical-report categories.
- Private object storage, validated server uploads, controlled downloads, HTTPS external resources and opt-in Google Slides previews.
- PostgreSQL full-text search, topic/type/year/publication-category filters and pagination.
- Bookmarks, sanitized BibTeX export, related resources, reports and moderator removal with review reasons.
- Separate researcher, moderator and administrator capabilities. Administrators can assign reviewer roles; researchers cannot assign roles or claim ownership through client data.
- Real empty/loading/error/success states. No fabricated publications, platform counts, login success or simulated uploads.

## Current readiness

The repository was empty when implementation began. Application code and the initial migration are complete; **a configured Supabase project is required before the live research workflow can run**. With no backend keys, a clearly labeled setup preview renders the interface and empty library. Account creation, submission and uploads do not pretend to succeed.

Local type checking, lint, security unit tests, production HTTP smoke checks and a production build were run. Browser/mobile visual QA remains pending because the environment has no Chromium executable. See [verification details](docs/VERIFICATION.md) for actual checks and remaining live checks. No successful Vercel deployment is claimed. The connected Vercel API rejected project creation with HTTP 403; the Vercel CLI was unavailable in the implementation environment.

## Stack and architecture

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · Supabase Auth, PostgreSQL and Storage.

Supabase is accessed through its maintained REST APIs using native server-side `fetch`; no browser database/auth SDK or custom password database is used. Password validation and hashing are performed by Supabase Auth. The application does not implement password cryptography.

| Area | Implementation |
| --- | --- |
| UI and routing | `app/`, reusable components in `components/` |
| Form mutations | `app/actions.ts`, progressive forms with `useActionState` |
| Auth/data adapter | `lib/backend.ts`, per-request verified identity |
| Session refresh | `proxy.ts` |
| Validation | `lib/validation.mjs` |
| Database, RPCs and policies | `supabase/migrations/202610150001_researchdock.sql` |
| File delivery | `app/materials/[id]/route.ts` |
| Citation export | `app/resources/[id]/citation/route.ts` |

Core flow: register and confirm email → sign in → create project → save resource draft → attach material → preview → submit → a different moderator approves → approved public resource appears in search. Private approved resources remain private.

## 1. Install

Use Node.js **22 or 24**, npm and a new Supabase project.

```bash
npm install
cp .env.example .env.local
```

Dependencies are pinned in `package.json` for the runtime stack. Generate and commit a package lock with `npm install` in an environment with registry access. No lockfile was fabricated when registry access was blocked during implementation.

## 2. Configure Supabase

In the Supabase dashboard, create a project and obtain its project URL, public anon API key and legacy service-role API key from Project Settings → API.

Set these in `.env.local` and the Vercel project environment settings:

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project HTTPS URL | Public configuration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key; all normal data requests use this with the user's verified JWT | Public key; RLS is mandatory |
| `SUPABASE_SERVICE_ROLE_KEY` | Validated server-side file upload only | **Server-only secret; never prefix with NEXT_PUBLIC** |

No application database operation uses the service-role key. Owner/moderator checks and database row-level security apply to normal application requests. The privileged key is restricted in application code to the storage upload boundary after validating identity, ownership, editable status, file type, size and signature. Direct client storage uploads have no INSERT policy and are rejected.

If the service-role key is missing, HTTPS link attachments work, but file uploads return an explicit configuration error.

## 3. Apply the migration

Open Supabase SQL Editor in the intended new project and run the **entire** contents of:

`supabase/migrations/202610150001_researchdock.sql`

Alternatively use the Supabase CLI with the repository linked to the correct project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration is transactional and creates:

- `profiles`, `user_roles`, `projects`, `resources`, `materials`, `bookmarks`, `reports`, `review_events`;
- signup profile trigger, full-text index, paginated search RPC;
- owner-derived resource save, transition, attachment-removal, report-resolution and administrator role RPCs;
- row-level policies and explicit grants;
- a **private** `research-materials` bucket, 3 MB maximum, permitted MIME types and file read/deletion policies.

Run once on a fresh project. Do not paste it repeatedly into an existing database. Future changes should be new migrations. Keep the bucket private; do not add public upload/read policies.

## 4. Configure authentication

In Supabase Authentication:

1. Enable Email/password sign-in. Require email confirmation for production.
2. Set Site URL to your deployed ResearchDock origin; use `http://localhost:3000` for a separate local development project. Add the exact deployed origin to redirect allowlists when needed.
3. Keep the default confirmation flow, which verifies the account through Supabase's verification endpoint and returns the user to the configured Site URL. The user can then sign in with email and password; no client-only session is assumed on redirect.
4. Configure production SMTP and provider rate limits before opening registrations. Supabase applies auth rate limits; this application does not claim CAPTCHA or a distributed application rate limiter.
5. Register test researcher and moderator accounts and confirm their email addresses.

Sessions are stored in HTTP-only, SameSite=Lax cookies; production cookies are Secure. `proxy.ts` refreshes expiring sessions. Server access uses `/auth/v1/user` to verify the access token, rather than trusting cookie contents. No role from signup metadata is used for authorization.

## 5. Bootstrap the first administrator

Register the administrator normally and obtain their verified UUID from Supabase Authentication → Users. Run in SQL Editor as the trusted database operator:

```sql
insert into public.user_roles (user_id, role)
values ('REPLACE_WITH_VERIFIED_USER_UUID'::uuid, 'administrator')
on conflict (user_id) do update set role = excluded.role;
```

This is an operator-only bootstrap step. Never derive it from a submitted email or signup metadata. Administrators can subsequently assign moderator/administrator roles from the moderation page using verified account UUIDs. Self-role changes are blocked. Use a **different account** to moderate a resource; authors cannot approve their own packages.

## 6. Run and verify

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
npm run test:smoke # unconfigured setup preview only
```

For local dependency symlinks outside the project root, Turbopack may reject the external path. The implementation environment verified `npm run build -- --webpack` successfully using available local dependencies. A regular clean installation uses the standard `npm run build` command.

Run the real-backend test **only in a disposable Supabase test project**:

```bash
node --env-file=.env.local --env-file=.env.test.local tests/live-backend.mjs
```

`.env.test.local` must supply `RD_TEST_OWNER_EMAIL`, `RD_TEST_OWNER_PASSWORD`, `RD_TEST_OTHER_EMAIL`, `RD_TEST_OTHER_PASSWORD`, `RD_TEST_MOD_EMAIL`, `RD_TEST_MOD_PASSWORD`. All accounts must be confirmed; the third must have a moderator/administrator role. The script creates clearly labeled disposable demonstration records and removes its records/files using the trusted test-only service key. It checks ownership, role escalation, private drafts/files, package freezing, moderation, public search, bookmarks, reports and withdrawal. It intentionally exits with status 2 if credentials are missing; this is not a passing test.

A browser acceptance checklist is in [docs/VERIFICATION.md](docs/VERIFICATION.md). Unit checks do not substitute for running the configured backend or testing email delivery.

## 7. Deploy to Vercel

Preferred Vercel project name: **researchdock**. No domain availability is guaranteed.

1. Import `Arungharami/researchdock` from GitHub into the intended Vercel team.
2. Select Next.js, repository root, Node 22.x or 24.x. `vercel.json` supplies build/install commands.
3. Set all three environment variables above for the intended environments. Use a separate Supabase project for previews if possible; do not share production data indiscriminately with preview deployments.
4. Confirm the Supabase migration and private bucket exist before testing the deployed flow.
5. Deploy, then set Supabase Site URL to the actual production origin. Configure SMTP and exact redirect origins.
6. Run the full acceptance flow using separate researcher and moderator accounts, test private attachment access anonymously, and check mobile layouts.
7. Publish a live URL only after deployment reports ready and those deployed checks pass.

CLI alternative, from an authenticated machine with the intended team:

```bash
vercel link --scope aruns-projects-ba93fc58 --project researchdock
vercel env pull .env.local
vercel --prod --scope aruns-projects-ba93fc58
```

The implementation session could read Vercel projects but project creation was denied (403) and no CLI fallback was installed. This requires permission to create/import a project in the intended team; retrying the same denied API action does not resolve it.

## Security and workflow boundaries

- All standard database writes are user-JWT scoped. Resource ownership is set from `auth.uid()` inside definer RPCs; client-supplied owner/role fields are ignored or denied.
- Direct resource/role mutations are not granted. Row-level policies protect profiles, projects, resources, files, bookmarks, reports and review history.
- Submitted packages are frozen. A row lock serializes material attachment/removal with submission and review transitions. Approved packages must be withdrawn to draft before editing.
- Public reads require `status = approved` **and** `visibility = public`. Private drafts do not appear in public search, associated-material queries or file signing.
- Moderators may inspect private submissions and drafts for platform operations, as disclosed in policies. Administrators additionally manage roles. Review decisions require reasons and are recorded in `review_events`.
- Storage upload goes through the validated server action; no unvalidated direct client INSERT policy exists. MIME/extension/size and basic PDF/PPTX signatures are checked. This is **not malware scanning** or comprehensive document-format validation.
- Files are served as downloads via expiring 60-second signed links. Already issued links remain usable until expiration after withdrawal. External HTTPS resources open with appropriate rel attributes; no arbitrary iframe host is accepted. Google Slides previews load only when the reader expands them.
- Supabase RLS remains essential even though form mutations are server-side. Next.js Server Actions provide same-origin request checks. Do not weaken the grants or add a browser service-role client.

## Known limits and deferred work

- Backend email delivery, RLS, SQL execution, actual upload/signing and the entire authenticated workflow require the live Supabase acceptance run; they were not executable without service configuration in this session.
- No malware scanning, automatic copyright verification, DOI lookup verification or scholarly peer review is claimed.
- Large datasets/video/notebooks/code use external links. PDF/PPTX files have download fallbacks; Google Slides is the supported presentation preview provider.
- Team members and affiliations are self-reported text; multi-owner project collaboration and invitations are future work.
- Profile/request deletion is operator-mediated. Review retention and deletion procedures before public launch.
- Public launch should add deployment-specific monitoring, backup/retention procedures and application abuse throttling based on expected usage.
- AI assistants, recommendations, subscriptions and complex social features are intentionally deferred.
