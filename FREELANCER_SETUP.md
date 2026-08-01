# LeadPilot AI Freelancer Profiles

## Database and storage

Apply `supabase/migrations/20260801_freelancer_profiles.sql` through the normal reviewed Supabase migration workflow. It creates:

- freelancer profiles and private contact details;
- username history and safe legacy-link redirects;
- social links and portfolio projects;
- single-use review requests, moderated reviews, and review reports;
- private verification applications;
- an explicit administrator allowlist;
- review rate-limit events;
- `freelancer-media` public storage for portfolio/profile images;
- `verification-private` private storage for identity documents.

The migration is intentionally not run automatically. It contains row-level security policies. Public pages read privacy-filtered data through server code; clients cannot directly select complete freelancer profiles.

## Authorised administrators

Add administrators only through a trusted Supabase SQL/admin workflow using the authenticated user UUID:

```sql
insert into public.app_admins (user_id, role)
values ('AUTH_USER_UUID', 'admin');
```

Never expose this operation in the client. Valid roles are `moderator`, `admin`, and `owner`.

## Environment variables

No new environment variables are required. Existing Supabase variables are used:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_APP_URL` for the public profile origin where configured

## Moderation and verification

- New client reviews start as `pending`; only approved reviews affect public ratings.
- Review links are cryptographically random, expire after 30 days, and become single-use after submission.
- A verification application changes a profile to `pending`, never directly to `verified`.
- Only a UUID listed in `app_admins` can approve, reject, or suspend verification.
- Verification documents remain in private storage and admin links expire after 60 seconds.

## Local testing

1. Apply the migration to a non-production Supabase project.
2. Start the app with `npm run dev`.
3. Sign in and open `/profile`.
4. Choose a username, complete the profile, upload images, configure privacy, and add a portfolio project.
5. Open `/freelancer/USERNAME` in a private browser window and verify hidden fields do not appear.
6. Open `/client-reviews`, create a request, and submit it from the generated public link.
7. Confirm the link cannot be reused and the review is not public while pending.
8. Add a test administrator to `app_admins`, open `/admin/freelancers`, and approve the review.
9. Verify the public rating, review count, and distribution update using approved reviews only.
10. Submit a test verification application and confirm documents are inaccessible publicly before reviewing it as an administrator.
