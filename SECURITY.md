# Security audit — 22 October 2026

Reviewed source, dependency locks, client trust settings and all committed Supabase migrations. This is a repository review, not a penetration test or a certification of the deployed service. No live equipment data was changed.

## Findings and changes

- **High: unauthorized equipment changes.** The previous migrations allowed anonymous updates to motors, gearboxes and pumps, and anonymous history inserts. Authenticated accounts could also write without staff approval. The new migration removes permissive write policies, requires administrator-managed `equipment_editors` membership, and checks authorization in PostgreSQL. Public equipment and history reads remain intentional for QR scanning.
- **History integrity.** Status validation, row locking, status/location updates and the history insert now run in one database transaction through `change_equipment_status`. Direct client status/location updates are denied. If history insertion fails, the entire change rolls back.
- **Untrusted QR destination.** Displayed and downloaded QR images are regenerated from the current origin and equipment ID. Stored `qr_code` values are never used as an image or download URL.
- **Dependencies and runtime.** Updated Vite, React Router, Tailwind and their dependencies; removed the obsolete tagging plugin and Bun locks. Use the npm lockfile and Node 24.22.1 or a newer 24.x security release. Runtime checks reject older Node and disabled TLS verification. The development server binds to localhost.
- **Browser hardening.** Vercel configuration adds a content security policy, MIME sniffing protection and a referrer policy. Service worker registration runs from the compiled script, compatible with the policy.

## Required deployment steps

1. Review and apply `supabase/migrations/20261022000000_restrict_equipment_writes.sql` using an authorized Supabase administrator. The migration was tested locally; it has **not** been applied to the live project. Back up the database and compare live policies/privileges with the committed schema before deployment.
2. Create or invite approved staff in Supabase Auth and establish their password through the normal account flow. Do not enable public sign-up to grant editing: a signed-in account alone cannot edit.
3. In the administrator SQL editor, grant membership to a verified staff user ID:

   ```sql
   -- Replace the placeholder with the verified UUID from Supabase Auth.
   INSERT INTO public.equipment_editors (user_id)
   VALUES ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid)
   ON CONFLICT DO NOTHING;
   ```

   Revoke access by deleting that user's membership. The database checks membership on every mutation, so revocation does not wait for JWT expiry.
4. Deploy the matching frontend. Apply the database restriction first; older frontends will lose editing until the new frontend is deployed. Without an approved staff member, all clients remain read-only.
5. Verify anonymous reads, denied anonymous writes, approved staff updates, and history using a non-production test record. The client must contain only a publishable/anon key; never a service-role key.

The migration intentionally preserves public inventory/history access. If locations, reasons or serial numbers are confidential, change the product's read-access requirements and SELECT policies before putting that data here. Approved editors are trusted to create and delete equipment.

## Validation

- Production build and app TypeScript check passed.
- `npm audit` reported **0 known vulnerabilities** (all dependency groups) on 22 October 2026; the original lock reported 38.
- `npm test` replays the migrations in isolated PostgreSQL/PGlite and verifies public reads, denied anonymous/unapproved writes, membership protections, authorized transitions for all three equipment tables, required fields, terminal status, rollback and immediate revocation.
- Chromium checks against local fixture APIs passed public/staff access, canonical QR generation, status RPC submission and sign-out. No production APIs were used; no browser runtime or CSP errors were observed.

## eMudhra reference and limits

The [incident reference](https://emudhra.we-have-a-problem.com/) concerns compromised certificate authority keys, including trust stores outside browsers. The [official Node security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) includes the CA update in 24.22.1. This patch pins that release and keeps certificate verification enabled; no embedded private CA bundle or TLS bypass was found in current first-party code.

Repository changes cannot update deployed hosts, CI runner internals, browsers, mobile operating systems, system CA stores or externally supplied `NODE_EXTRA_CA_CERTS`/OpenSSL trust settings. Their operators must install the relevant vendor updates and verify the actual trust path. The Vercel headers apply only where this configuration is honored. Full Git history, hosting controls and live database drift were not audited.

Tailwind 4 requires modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+). Review the preview on supported target devices before release. A clean dependency audit does not prove the absence of vulnerabilities.
