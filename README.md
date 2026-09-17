# Africa Halal Integrity System

![Africa Halal Institute](https://img.shields.io/badge/Africa%20Halal%20Institute-AHIS-0f3d20?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white)

The **Africa Halal Integrity System (AHIS)** is a digital platform for managing halal certification operations from application through inspection, approval, certificate issuance, and public verification.

It provides a secure, role-based workspace for certification teams, inspectors, supervisors, and certified businesses, supported by a public-facing website and certificate verification experience.

## Overview

AHIS brings the core certification lifecycle into one system:

- Public information, services, standards, directory, contact, and certificate verification pages
- Business registration and halal certification applications
- Application status tracking, document management, and communication
- Inspection scheduling, reports, observations, incidents, and non-conformance records
- Certificate vault, certificate history, QR-enabled verification, and downloadable PDFs
- Billing, invoices, quotations, subscriptions, and Mobile Money payment workflows
- Separate client, inspector, supervisor, and administrator workspaces
- Role-based permissions, protected routes, audit logs, and tenant-aware data access
- Transactional email notifications and operational Edge Functions

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, React Router, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, Lucide React |
| Data and authentication | Supabase Auth, PostgreSQL, Row Level Security |
| Server-side workflows | Supabase Edge Functions |
| Forms and validation | React Hook Form, Zod |
| Documents and certificates | jsPDF, DOCX, QR code tooling, HTML-to-image |
| Charts and reporting | Recharts |
| Testing | Vitest, Testing Library, jsdom |
| Deployment | Vercel-compatible static SPA deployment |

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- Access to the project’s Supabase environment for authenticated and database-backed workflows

### Installation

```bash
git clone https://github.com/bukharidayib/africahalal.git
cd africahalal
npm install
```

### Run locally

```bash
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173`.

### Build and preview

```bash
npm run build
npm run preview
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run build:dev` | Create a development-mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the repository |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Application areas

### Public website

The public experience includes the home page, about page, services, standards, industries, blog, directory, contact page, city landing pages, and public halal certificate verification.

### Client portal

Businesses can register their organisation, submit and track applications, upload required documents, follow application timelines, communicate with the certification team, view inspection outcomes, manage billing, and access issued certificates.

### Inspector workspace

Inspectors can manage assigned inspections, review business and ingredient information, record observations and incidents, raise non-conformance records, submit reports, and communicate with clients and operations teams.

### Supervisor workspace

Supervisors can manage field activities, inspections, reports, performance information, incidents, non-conformance records, and assigned operational work.

### Administration

Administrators have access to organisation, user, role, permission, application, inspection, certificate, billing, support, content, and audit-management workflows.

## Backend and database

The `supabase/` directory contains the database and server-side integration layer:

- `supabase/migrations/` — versioned PostgreSQL schema, indexes, functions, triggers, and RLS policies
- `supabase/functions/` — Edge Functions for invitations, payments, PDFs, notifications, email, and operational workflows
- `supabase/config.toml` — Supabase local project configuration when using the Supabase CLI

The application uses Supabase Auth for sessions and PostgreSQL Row Level Security for data access. Do not bypass RLS or expose service-role credentials in browser code.

Before applying migrations or deploying Edge Functions, confirm that the target Supabase project and environment are correct. Never commit passwords, service-role keys, API secrets, or other private credentials.

## Configuration

The browser application requires a Supabase URL and publishable/anonymous key. Keep environment-specific configuration outside source control and provide it through the deployment platform or local environment configuration.

Typical public configuration values are:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key
```

Server-only values, including payment provider, email provider, and Supabase service-role secrets, must be configured in Supabase Edge Function secrets. They must never be placed in `VITE_*` variables or committed to the repository.

## Deployment

This is a Vite single-page application. A production deployment should:

1. Install dependencies with `npm ci`.
2. Configure the required public frontend variables.
3. Run `npm run lint`, `npm run test`, and `npm run build`.
4. Deploy the generated `dist/` directory.
5. Configure SPA fallback/rewrite behavior so application routes resolve to `index.html`.
6. Deploy and verify the required Supabase migrations and Edge Functions in the intended environment.
7. Perform an authenticated smoke test for each supported role and a public certificate-verification test.

The repository includes `vercel.json` with a catch-all rewrite for Vercel-style SPA hosting.

## Security principles

- Keep Supabase service-role keys and third-party secrets server-side only.
- Preserve Row Level Security policies and role-based authorization when changing schema or workflows.
- Validate all user-controlled input at the form and server boundaries.
- Treat certificate verification and certificate lifecycle actions as security-sensitive operations.
- Review database migrations and Edge Functions before applying them to a shared or production project.
- Use non-production accounts and data for local testing and development.

## Project structure

```text
src/
├── admin/              Administrator pages, layouts, permissions, and workflows
├── components/         Shared UI, layouts, certificates, billing, and application components
├── integrations/       Supabase client and generated database types
├── pages/               Public, auth, client, inspector, and supervisor routes
├── hooks/               Reusable React hooks
└── lib/                Validation, fees, utilities, and shared application logic

supabase/
├── functions/          Supabase Edge Functions
└── migrations/         Versioned database migrations and RLS policies

public/                 Static assets, manifest, sitemap, and public media
```

## Contributing

1. Create a feature branch from the default branch.
2. Keep changes focused and preserve existing authorization boundaries.
3. Add or update tests for behavior that changes.
4. Run the relevant validation commands locally:

   ```bash
   npm run lint
   npm run test
   npm run build
   ```

5. Review the diff for secrets, unrelated changes, and migration safety.
6. Open a pull request with a concise summary, validation results, and any required deployment notes.

## License and ownership

This repository contains proprietary software for the Africa Halal Institute. Unless a separate written agreement states otherwise, the source code is not licensed for redistribution, resale, or unauthorised commercial use.

For project, deployment, or integration enquiries, contact the maintainers through the organisation’s official channels.
