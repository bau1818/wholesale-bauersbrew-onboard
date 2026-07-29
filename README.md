# Bauer's Brew — Wholesale Onboarding

**This repo IS the live site at https://wholesale.bauersbrew.com.**
Vercel auto-deploys the `main` branch on every push. **`main` is the single
source of truth — there is no other "live" version anywhere.** Ignore any old
`*.vercel.app`, Netlify, or preview URLs; they are not this site.

## What each service does (5 total, each one job)
| Service | Its one job |
|---|---|
| **GitHub** (this repo, `main`) | The code. The truth. |
| **Vercel** (project `bauersbrew-wholesale-demo`) | Serves the site from `main`. |
| **Supabase** (project `bauersbrew-wholesale`) | Database — stores every application + signed agreement. The invisible engine; you never open it. |
| **Gmail** (`sales@bauersbrew.com`) | Sends the line-sheet email to prospects (`/api/send-catalog`). |
| **Formspree** | Emails you a notification when someone applies or signs. |

## The flow (what actually happens)
1. Prospect fills the form at `/` → saved to Supabase → you get a short **`/approve?id=…`** link by email.
2. You open `/approve` (password-gated), click **Approve** → it emails the client their short **`/agreement?id=…`** signing link.
3. Client signs at `/agreement` → signature saved to Supabase → you get a short **`/record?id=…`** link.
4. **Everything is visible at `/accounts`** — your dashboard. Each signed account has a downloadable PDF.

## Pages
| Path | Who | Purpose |
|---|---|---|
| `/` | Public | Application form + "request line sheet" box |
| `/thanks` | Public | Post-application confirmation |
| `/agreement?id=` | Client | Review + e-sign |
| `/terms` | Public | Standalone Terms & Conditions (link for your line sheet) |
| `/approve?id=` | Internal 🔒 | Review an application, email the signing link |
| `/accounts` | Internal 🔒 | **Home base** — all accounts + signed PDFs |
| `/record?id=` | Link only | The official signed agreement (print / save PDF) |
| `/preview` | Internal 🔒 | Demo hub — opens each page with sample data (not real records) |

🔒 = password-gated by `middleware.js` (password lives there).

## Common tasks
- **Update the line sheet:** replace `Wholesale_BauersBrew_LineSheet_2026.pdf` (same filename) and push. Nothing else.
- **See who signed / download a PDF:** open `/accounts`.

## Notes
- Static site — no build step; Vercel serves the repo root plus the `/api` functions.
- `/api/keepalive` + a daily Vercel cron keep the free Supabase project from pausing, so links never go dead.
