
# Enhancement: Full Status Email Notifications + PDF Certificate Attachment on Approval

## Current State Assessment

After reading all relevant files, here is exactly what already works and what is missing:

### What Already Works
- `send-status-notification` edge function exists and sends branded HTML emails via Resend for all 7 statuses
- `ApplicationDetail.tsx` already calls this function immediately after every status update
- For `approved` status, the email already includes a green certificate details block (number, scope, dates) in the email body
- The certificate record is created in the `certificates` table before the email is sent

### What Is Missing / Broken
1. **No PDF certificate attached to the approval email** — the email shows certificate details as text, but the client does not receive an actual downloadable PDF certificate file
2. **No congratulations-style dedicated approval email** — the approved email uses the same template as all status updates (a generic "status changed" layout)
3. The PDF is currently generated only in the browser (via `html-to-image` + `jsPDF`) — this approach cannot work inside an edge function

---

## The Solution: Serverside PDF Generation via Resend's PDF Attachment Support

Resend supports sending emails with **base64-encoded file attachments**. The edge function can generate a clean, professional certificate PDF using pure HTML-to-PDF rendering — no browser needed.

The approach:
- Generate an HTML certificate document server-side in the edge function
- Use a headless PDF approach: encode the certificate HTML as a base64 PDF using a Deno-compatible PDF library or a data-URI PDF workaround
- Attach it to the Resend email as `attachments: [{ filename, content (base64) }]`

**Best available approach for Deno edge functions:** Use `jsPDF` via `npm:jspdf` (Deno supports npm specifiers) to build a clean multi-section PDF certificate server-side. This is the same library used in the browser, but now runs in the Deno runtime inside the edge function.

---

## Detailed Plan: 3 Changes

---

### Change 1 — Upgrade `send-status-notification` Edge Function

**File:** `supabase/functions/send-status-notification/index.ts`

#### 1a. Split into two email paths

**For all non-approved statuses:** Keep the existing branded status update email template (no changes needed — it already works perfectly).

**For `approved` status only:** Send a completely separate **congratulations email** with:
- A celebratory green header: "🎉 Congratulations — Your Halal Certification is Approved!"
- Certificate details prominently displayed
- A "Download Certificate" button linking to the Certificate Vault in the client portal
- The actual **PDF certificate attached** to the email

#### 1b. Generate the PDF certificate server-side

Inside the edge function, when status is `approved`:

1. Fetch the certificate record from the `certificates` table (certificate_number, scope, issue_date, expiry_date, qr_hash)
2. Build the certificate as a PDF using `jsPDF` (via `npm:jspdf`):
   - A4 portrait page (210 × 297mm)
   - African Halal branding header (green gradient background, title)
   - "This is to certify that" + Organization name (large, prominent)
   - Certification scope in a styled box
   - Certificate number, issue date, expiry date in a grid
   - Verification QR code URL printed as text (QR image not possible server-side without extra library)
   - Footer with "African Halal Certification Board" and standard reference
3. Call `pdf.output('arraybuffer')` → convert to base64 string
4. Pass to Resend `attachments: [{ filename: 'Certificate-{number}.pdf', content: base64string }]`

#### 1c. Congratulations email template (approved only)

```
Subject: 🎉 Congratulations! Your Halal Certificate is Ready — {application_number}

Header: Celebratory green gradient with trophy/checkmark
Body:
  - "Dear {organization_name},"
  - "We are delighted to inform you that your Halal Certification application has been approved..."
  - Certificate details card (number, scope, validity period, expiry)
  - CTA button: "View Your Certificate Vault" → https://africahalal.lovable.app/client/certificates
  - "Your certificate is also attached to this email as a PDF for your records."
  - CC: admin@africanhalaal.com, operations@africanhalaal.com
```

#### 1d. Keep existing generic status email for all other statuses

No changes to the non-approved email path — it already handles all 7 statuses with the correct messages, colors, and CC list.

---

### Change 2 — Update `ApplicationDetail.tsx` to Pass Certificate Data

**File:** `src/admin/pages/ApplicationDetail.tsx`

Currently, in `handleStatusUpdate()`, when status changes to `approved`:
1. The certificate is created in the DB (lines 331–344)
2. Then the email is sent (lines 352–369)

The edge function already fetches the certificate from the DB using `application_id`. This means **no changes are needed** in `ApplicationDetail.tsx` for the certificate data — the edge function already handles it.

However, there is one small improvement to make: the email is currently sent **immediately after the status update** but **before `fetchApplicationDetails()` is called**. This is fine because the certificate is inserted into the DB before the email call. The ordering is correct.

**The only change needed:** Pass an additional `certificate_number` field in the email body payload so the edge function can use it as the PDF filename without needing an extra DB lookup. This is a minor optimization.

---

### Change 3 — Improve the Non-Approved Status Emails (Minor)

The existing status email body already works. One small addition to make each status email feel more personalized:

Add a **"What happens next?"** section specific to each status:

| Status | Next Step Text |
|--------|---------------|
| `submitted` | "Our team will review your application within 3-5 business days." |
| `under_review` | "An officer has been assigned and will contact you if additional documents are needed." |
| `awaiting_inspection` | "Please prepare your facility. An inspector will contact you to confirm the exact date." |
| `inspection_complete` | "The findings are under review. A decision will be made within 5 business days." |
| `rejected` | "You may contact our support team to discuss reapplication guidelines." |
| `suspended` | "Immediate action is required. Contact support@africanhalaal.com urgently." |

This makes the emails more informative and reduces inbound support queries.

---

## Technical Architecture

```text
Admin clicks "Update Status" → approved
         │
         ▼
ApplicationDetail.tsx
  1. UPDATE certification_applications SET status = 'approved'
  2. Log audit
  3. INSERT INTO certificates (creates record with cert number)
  4. supabase.functions.invoke('send-status-notification', { body: { application_id, new_status: 'approved', ... } })
         │
         ▼
send-status-notification Edge Function (Deno)
  ├── Detects new_status === 'approved'
  ├── Fetches certificate from DB (certificate_number, scope, issue_date, expiry_date, qr_hash)
  ├── Generates PDF using jsPDF (npm:jspdf)
  │     ├── Page 1: Full certificate layout
  │     └── pdf.output('arraybuffer') → base64
  └── Resend.emails.send({
        to: [contact_email, admin@, operations@],
        subject: "🎉 Congratulations! Your Halal Certificate is Ready",
        html: <congratulations email template>,
        attachments: [{
          filename: "Certificate-{number}.pdf",
          content: base64pdf
        }]
      })
         │
         ▼
Client receives:
  ✅ Beautiful congratulations HTML email
  ✅ PDF certificate attached (downloadable)
  ✅ Link to Certificate Vault in client portal
```

---

## Files to Change

| File | Type | What Changes |
|------|------|-------------|
| `supabase/functions/send-status-notification/index.ts` | Edge Function | Add PDF generation with `npm:jspdf`, split email into two paths (approved = congratulations + PDF attachment; all others = existing status update email), add "What happens next?" section to non-approved emails |
| `src/admin/pages/ApplicationDetail.tsx` | Code (minor) | Pass `certificate_number` in the email invocation payload (minor optimization — avoids one extra DB lookup in the edge function) |

---

## Why jsPDF in Deno (Not Puppeteer/HTML2PDF)

Puppeteer requires a full Chromium browser — impossible in Supabase edge functions (Deno). Other headless PDF libraries have no Deno support. `jsPDF` is a pure JavaScript PDF construction library with full npm compatibility and no browser dependency. It runs natively in Deno via `npm:jspdf`. The certificate will be built programmatically with styled text, boxes, and lines — matching the design language of the existing `CertificateTemplate.tsx`.

The PDF will include:
- Green header bar with "AFRICAN HALAL INTEGRITY SYSTEM" title
- Organization name (large, centered)
- "has been assessed and found to be in compliance with AHI Halal Standards"
- Scope box
- Certificate number, issue date, expiry date
- "Verification URL: https://africahalal.lovable.app/verify?id={qr_hash}"
- Footer: "Authorized by African Halal Certification Board"
