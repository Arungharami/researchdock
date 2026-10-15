# Verification record

Date: October 15, 2026.

## Story

A visitor explores approved public research. A researcher registers, creates a project, saves a private resource, attaches supporting materials and submits it. A different moderator approves it, making a public package discoverable with its associated materials.

## Executed in the implementation environment

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Repository inspection | Confirmed empty | GitHub metadata size 0; README read returned “This repository is empty.” |
| TypeScript | Passed | `npm run typecheck` |
| Lint | Passed | `npm run lint`, no warnings after correction |
| Security unit tests | Passed | 5 tests: URLs, uploads, query identifiers/bounds, citation escaping, preview allowlist |
| Production compilation | Passed | `npm run build -- --webpack`; all 16 application route entries generated |
| Production HTTP smoke | Passed | Ten setup-preview routes return 200 and identify unconfigured backend; invalid resource renders unavailable |
| Browser/mobile visual QA | Blocked | Playwright is installed but its Chromium executable is absent; no browser result claimed |
| Registry installation | Blocked | npm registry returned 403; available local dependencies used, no fabricated lockfile |
| Vercel project creation | Blocked | Intended team API returned 403 forbidden; no local Vercel CLI fallback |
| Supabase migration and live workflow | Not run | No Supabase project URL, API keys or test credentials provided |

Production HTTP smoke checks used the actual built Next.js handler. Browser layout inspection could not run because the installed Playwright package has no Chromium executable. Desktop/mobile visual QA remains pending. A compile success does not establish live database authorization or storage behavior.

## Required configured acceptance run

Use a disposable Supabase project first. `tests/live-backend.mjs` exercises actual REST/RPC/storage boundaries; it does not simulate success when configuration is missing. Then run the browser journey on the deployed application:

1. Register researcher A, confirm email, sign in, reload and verify the session persists. Sign out and confirm dashboard access requires authentication.
2. Update public profile fields; confirm email/session tokens are absent from the researcher page.
3. Create a private project with methodology, team, milestones and updates. Confirm researcher B and an anonymous browser cannot see it.
4. Save a resource draft linked to the project, with accurate category, authors, date, terms and sharing confirmation. Reject invalid URLs and missing permission confirmation.
5. Attach valid PDF/PPTX/CSV/TXT files and an HTTPS source. Reject oversized files, unsupported types and invalid basic signatures. Verify missing storage-secret errors are explicit. Preview the package.
6. Check that anonymous and researcher B cannot read the draft, list its materials, sign its private files, alter its owner or assign a role. Check direct storage INSERT is rejected.
7. Submit. Confirm metadata, attachments and material removal are frozen until withdrawal or rejection. Confirm neither author nor researcher B can approve it.
8. As a distinct moderator, review the package and record an approval reason. Check public search, filters, pagination, resource page, connected materials and downloads.
9. Test Google Slides preview with a presentation you own and an accessible HTTPS deck URL; check the external-link fallback. Export BibTeX and bookmark using researcher B.
10. Reject a second submission with reasons and confirm the owner can revise it. Withdraw an approved package and confirm it disappears from public search, and new anonymous file signing fails. Previously issued URLs expire within 60 seconds.
11. File and resolve a content report. Unpublish an approved resource with a reason. Verify administrator role assignment only works for database-assigned administrators and self-role changes fail.
12. Inspect 390 px mobile and desktop layouts, keyboard focus, form labels, loading/pending states, empty results, unavailable backend handling and server logs. Repeat the core journey on the actual production deployment before reporting its URL as verified.

## Operational considerations

Use separate Supabase environments, production SMTP, appropriate provider limits, backups and monitoring. Upload validation is not malware scanning. Moderation is not scholarly peer review. No fabricated sample research is seeded.
