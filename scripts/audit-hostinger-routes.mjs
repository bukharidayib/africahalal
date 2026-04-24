#!/usr/bin/env node
/**
 * Hostinger SPA Route Refresh Audit
 *
 * Hits every portal route directly (simulating a hard refresh / direct URL paste)
 * and reports which ones don't return the SPA shell.
 *
 * Usage:
 *   node scripts/audit-hostinger-routes.mjs https://your-domain.com
 */

const origin = process.argv[2];

if (!origin || !/^https?:\/\//.test(origin)) {
  console.error("Usage: node scripts/audit-hostinger-routes.mjs <origin>");
  console.error("Example: node scripts/audit-hostinger-routes.mjs https://example.com");
  process.exit(2);
}

const ROUTES = [
  // Public
  "/",
  "/about",
  "/standards",
  "/certification-journey",
  "/industries",
  "/services",
  "/directory",
  "/directory/restaurants",
  "/verify",
  "/contact",
  "/blog",
  "/blog/sample-post",
  "/halal-certification-zambia",
  "/halal-certification-lusaka",
  "/halal-certification/ndola",
  "/verify-halal-certificate",
  "/verify-certificate",
  "/payment/success",
  "/payment/failed",

  // Client auth
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",

  // Client portal
  "/client/dashboard",
  "/client/businesses",
  "/client/apply",
  "/client/applications",
  "/client/applications/abc",
  "/client/documents",
  "/client/inspections",
  "/client/compliance",
  "/client/certificates",
  "/client/support",
  "/client/support/tickets",
  "/client/support/tickets/new",
  "/client/support/tickets/abc",
  "/client/support/faq",
  "/client/support/chat",
  "/client/billing",
  "/client/billing/invoices",
  "/client/billing/invoices/abc",

  // Admin portal
  "/admin/login",
  "/admin/register",
  "/admin/dashboard",
  "/admin/applications",
  "/admin/applications/abc",
  "/admin/certificates",
  "/admin/inspections",
  "/admin/inspections/abc",
  "/admin/approvals",
  "/admin/audit-logs",
  "/admin/users",
  "/admin/supervisors",
  "/admin/blogs",
  "/admin/enforcement",
  "/admin/inspectors",
  "/admin/settings",
  "/admin/support",
  "/admin/support/tickets",
  "/admin/support/tickets/abc",
  "/admin/support/chats",
  "/admin/support/chats/abc",
  "/admin/roles",
  "/admin/roles/abc",
  "/admin/billing",
  "/admin/ingredients",
  "/admin/supervisor-reports/abc",

  // Inspector portal
  "/inspector/signin",
  "/inspector/register",
  "/inspector/forgot-password",
  "/inspector/reset-password",
  "/inspector/dashboard",
  "/inspector/inspections",
  "/inspector/inspections/abc",
  "/inspector/notifications",
  "/inspector/support/tickets",
  "/inspector/support/tickets/new",
  "/inspector/support/tickets/abc",
  "/inspector/support/chat",
  "/inspector/reports",
  "/inspector/reports/new",
  "/inspector/reports/abc",
  "/inspector/incidents",
  "/inspector/incidents/new",
  "/inspector/ncrs",
  "/inspector/ncrs/abc",
  "/inspector/observations",
  "/inspector/manager/supervisors",
  "/inspector/manager/inspections",

  // Supervisor portal
  "/supervisor/signin",
  "/supervisor/register",
  "/supervisor/forgot-password",
  "/supervisor/reset-password",
  "/supervisor/dashboard",
  "/supervisor/inspections",
  "/supervisor/inspections/abc",
  "/supervisor/reports",
  "/supervisor/reports/new",
];

const base = origin.replace(/\/+$/, "");

async function checkRoute(path) {
  const url = base + path;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "manual",
    });
    const ct = res.headers.get("content-type") || "";
    if (res.status >= 300 && res.status < 400) {
      return { path, ok: false, reason: `redirect ${res.status} -> ${res.headers.get("location")}` };
    }
    if (res.status !== 200) {
      return { path, ok: false, reason: `HTTP ${res.status}` };
    }
    if (!ct.includes("text/html")) {
      return { path, ok: false, reason: `content-type ${ct}` };
    }
    const body = await res.text();
    if (!body.includes('id="root"')) {
      return { path, ok: false, reason: "response is not the SPA shell (missing #root)" };
    }
    return { path, ok: true };
  } catch (err) {
    return { path, ok: false, reason: `fetch error: ${err.message}` };
  }
}

const PAD = ROUTES.reduce((m, r) => Math.max(m, r.length), 0) + 2;

console.log(`\nAuditing ${ROUTES.length} routes against ${base}\n`);

const results = [];
// Run with limited concurrency to avoid overwhelming Hostinger.
const CONCURRENCY = 6;
let cursor = 0;
async function worker() {
  while (cursor < ROUTES.length) {
    const idx = cursor++;
    const r = await checkRoute(ROUTES[idx]);
    results[idx] = r;
    const status = r.ok ? "\x1b[32mOK  \x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const reason = r.ok ? "" : ` — ${r.reason}`;
    console.log(`${status}  ${r.path.padEnd(PAD)}${reason}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} OK, ${failed.length} FAIL out of ${results.length}\n`);

if (failed.length) {
  console.log("Failed routes:");
  for (const f of failed) console.log(`  - ${f.path}  (${f.reason})`);
  console.log("\nTip: ensure public/.htaccess was uploaded to public_html/ on Hostinger");
  console.log("(enable 'Show hidden files' in the File Manager).\n");
  process.exit(1);
}

console.log("All routes serve the SPA shell. SPA fallback is working.\n");
