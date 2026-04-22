

## Plan: Fix Directory data, Replace Services image, Update Contact form + email notifications

### 1. Directory page — "No Certified Businesses Found"

**Root cause:** The `certificates` and `organizations` tables have RLS policies only for admins, clients, inspectors and supervisors. The public Directory page is fetched anonymously, so the anon role can't read any rows — the query returns empty even though 2 active certificates exist in the database.

**Fix:** Add public-read RLS policies that expose **only the minimal fields needed for the directory** — and only for `active` certificates.

Migration:
```sql
-- Allow anyone to view ACTIVE certificates (public directory)
CREATE POLICY "Public can view active certificates"
ON public.certificates FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Allow anyone to view organizations that have an active certificate
CREATE POLICY "Public can view orgs with active certificates"
ON public.organizations FOR SELECT
TO anon, authenticated
USING (
  id IN (SELECT organization_id FROM public.certificates WHERE status = 'active')
);
```

This keeps non-active certs and unrelated orgs private. Sensitive PII columns (contact_email, contact_phone) on the orgs of certified businesses are already shown in the Directory by design — that's the purpose of the public registry.

After migration, the existing 2 active certificates ("Bukhari Restaurents") will appear in the Directory automatically.

### 2. Services page — replace Halal Certification image

Steps:
1. Copy the uploaded photo to `src/assets/services/halal-certification.jpg` (overwrites the current image).
2. No code change needed — `Services.tsx` already imports from this path.

### 3. Contact page — Subject as text field + email notifications

**A. Convert Subject from dropdown to text input**
- Remove the `Select`/`SelectContent` block (lines ~200–215 in `Contact.tsx`)
- Replace with a standard `<Input name="subject" />` matching the other fields
- Remove unused `Select` imports and the `subjects` array

**B. Send email notifications to `info@africanhalaal.com` and `support@africanhalaal.com`**

Approach: use Lovable's built-in email infrastructure (transactional emails) — recommended default, no third-party API key needed.

Steps the implementation phase will perform automatically:
1. Set up the email domain (one-time dialog appears on first run if not configured)
2. Set up email infrastructure (queues, tables, cron)
3. Scaffold the transactional email function
4. Create a React Email template `contact-form-notification.tsx` that renders the visitor's name, email, phone, company, subject and message in a clean branded layout
5. Register the template in `registry.ts`
6. In `Contact.tsx` `handleSubmit`, after validation:
   - Insert a row into a new `contact_submissions` table (so messages are also stored, not lost)
   - Invoke `send-transactional-email` **twice** — once per recipient (`info@africanhalaal.com` and `support@africanhalaal.com`) — with idempotency keys derived from the submission UUID
   - Show the existing success toast and reset the form

New table:
```sql
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- Only admins can read submissions
CREATE POLICY "Admins can view submissions"
ON public.contact_submissions FOR SELECT
TO authenticated USING (public.is_admin_user(auth.uid()));
```

### Files changed / created

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | RLS for public directory + `contact_submissions` table |
| `src/assets/services/halal-certification.jpg` | Replaced with uploaded photo |
| `src/pages/Contact.tsx` | Subject → Input, real submit → DB insert + 2 email sends |
| `supabase/functions/_shared/transactional-email-templates/contact-form-notification.tsx` | New React Email template |
| `supabase/functions/_shared/transactional-email-templates/registry.ts` | Register new template |
| (Auto) email infra + send-transactional-email function | Scaffolded by tooling |

### Notes
- Build error mentioning `npm:openai@^4.52.5` is unrelated to these changes — no edge function in this repo imports `openai`. It looks like a stale deploy bundler artifact and should clear on next successful deploy. If it persists after this work, I'll investigate separately.
- Directory currently has 2 active certificates in DB — both will appear immediately after the RLS migration.
- Both notification emails are sent server-side via the queue, so retries and rate-limits are handled automatically.

