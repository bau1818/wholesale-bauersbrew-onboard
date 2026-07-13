# Bauer's Brew — Wholesale Onboarding

Source of truth for **wholesale.bauersbrew.com**. Deployed automatically to Vercel on every push to `main`.

## Files
| File | Purpose |
|---|---|
| `index.html` | Stage 1 — prospect application form (Formspree) |
| `approve.html` | Internal review — one-click "Approve & email agreement" |
| `agreement.html` | Stage 2 — client e-signature, 8-clause NY T&C |
| `seller-signature.png` | Seller signature, self-hosted (do not move) |

## Notes
- The seller signature is served from this repo at `/seller-signature.png`. It was previously hosted on the Shopify CDN, where the asset became corrupt and failed to render. Keep it here.
- Static site: no build step. Vercel serves the repo root.
- T&C pending attorney review.
