# Plan: ZynlePay Node.js Proxy on Hostinger

## What you're getting

Two JavaScript files that replace your PHP proxies, deployable to Hostinger as a small Node.js app under `/Proxy/`. Once deployed, your existing Supabase edge functions will work unchanged because they already call:

- `https://africanhalaal.com/zynlepayProxy.php` → will become `https://africanhalaal.com/Proxy/zynlepayProxy`
- `https://africanhalaal.com/zynlepayStatusProxy.php` → will become `https://africanhalaal.com/Proxy/zynlepayStatusProxy`

(Final URLs depend on the Application URL you set in hPanel — instructions below.)

## Important: Hostinger needs Node.js enabled

A `.js` file uploaded to `public_html/` does NOT execute on standard shared hosting — Apache just serves it as text. To run JavaScript server-side on Hostinger you need:

- **Hostinger Premium / Business / Cloud / VPS** plan (Single plan does not support Node.js)
- Node.js app created in **hPanel → Advanced → Node.js**

If your plan does not support Node.js, the only working JS-style option is Cloudflare Workers (or stick with PHP). I'll flag this clearly in the README.

## Files I'll create

Saved to `/mnt/documents/zynlepay-proxy/` for download:

```text
zynlepay-proxy/
├── zynlepayProxy.js          # POST /zynlepayProxy → forwards to jsonapi
├── zynlepayStatusProxy.js    # POST /zynlepayStatusProxy → forwards to paymentstatus
├── server.js                 # Express server that mounts both proxies
├── package.json              # express + node-fetch dependencies
├── .htaccess                 # tells Apache to pass /Proxy/* to Node
└── README.md                 # step-by-step Hostinger deploy guide
```

## Why Express (not raw `http`)

Hostinger's Node.js app runner expects a single entry point (`server.js` or `app.js`) that listens on a port. Express keeps `zynlepayProxy.js` and `zynlepayStatusProxy.js` as clean, focused modules (one job each) while `server.js` wires them up — same separation as your PHP files, but with proper routing.

## Behavior parity with your PHP files

Each proxy module will:
- Accept `POST` with JSON body (return health-check JSON on `GET`)
- Validate JSON, return `400` on bad input
- Forward the raw body to the upstream ZynlePay URL with a 90s timeout
- Mirror the upstream HTTP status and JSON response back to the caller
- Return a clean JSON error envelope on network failure (never crash the response)

## Hardening over your current PHP

1. SSL verification **enabled** (your PHP disables it — security risk, not needed)
2. `display_errors` equivalent **off** in production logs
3. Optional shared-secret header (`X-Proxy-Secret` checked against `PROXY_SHARED_SECRET` env var) — if unset, behavior is unchanged
4. Permissive CORS so it can also be called from a browser if ever needed
5. Health-check `GET` endpoint on each route, same shape as your PHP version

## Hostinger deployment steps (will be in README)

1. Upload the `zynlepay-proxy/` folder to `domains/africanhalaal.com/private_html/proxy/` (or any folder outside `public_html`)
2. hPanel → **Advanced → Node.js → Create Application**
   - Node version: 18 or higher
   - Application root: the folder from step 1
   - Application URL: `africanhalaal.com/Proxy`
   - Startup file: `server.js`
3. Click **Run NPM Install**
4. Click **Start App**
5. Test in browser: `https://africanhalaal.com/Proxy/zynlepayProxy` should return the health-check JSON

## Edge function update (after deployment is verified)

Once you confirm the new URLs work, I'll update two lines in the Supabase edge functions:

- `supabase/functions/process-momo-payment/index.ts` line 193 — swap `zynlepayProxy.php` → `Proxy/zynlepayProxy`
- `supabase/functions/check-payment-status/index.ts` line 120 — swap `zynlepayStatusProxy.php` → `Proxy/zynlepayStatusProxy`

I will **not** delete the old `.php` files — keep them as a fallback until the Node app is confirmed stable.

## Out of scope

- Setting up Hostinger Node.js add-on for you (must be done in hPanel)
- Changing the IP address ZynlePay whitelists (Hostinger Node app uses the same server IP as PHP, so no action needed)
- Any change to the React app — the frontend never talks to these proxies directly
