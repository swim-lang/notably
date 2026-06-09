# Notably — Site

A static marketing site for Notably (Julie Anich, accounting/finance/tax recruiting). One page, no build step, deployable anywhere.

## Files

```
notably-site/
├── index.html       Semantic markup for all 17 sections + nav/footer.
├── styles.css       Design tokens + responsive layout. Mirrors design-tokens.md.
├── script.js        Mobile-nav toggle, newsletter form handling, anchor scroll.
└── assets/
    └── julie.jpg    Portrait for the "Meet Julie" section. (Add this.)
```

## Run locally

No build tools required. Either:

```bash
# Python 3 (built into macOS)
cd notably-site
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just double-click `index.html` to open it in a browser — the only thing that breaks under `file://` is the Google Fonts fallback link (it'll still render with system fonts).

## Deploy

This is a static site. Drop the folder into any of these:

- **Netlify** — drag the `notably-site/` folder onto netlify.com/drop
- **Vercel** — current launch target is `anchovies/notably`
- **GitHub Pages** — push and enable Pages
- **Cloudflare Pages, S3, etc.** — same drill

Current launch setup:

- Production fallback URL: `https://notably-rust.vercel.app`
- Intended domain: `https://notablyrecruit.com`
- Registrar DNS still needs to point at Vercel:
  - `A notablyrecruit.com 76.76.21.21`
  - `A www.notablyrecruit.com 76.76.21.21`

## Before going live

1. **License + self-host Rhetorik fonts.** The CSS declares `Rhetorik Sans Trial` and `Rhetorik Serif Trial` first, then falls back to DM Sans / Newsreader from Google Fonts. Once you license Rhetorik from AllCaps, drop the `.woff2` files into `assets/fonts/`, add `@font-face` blocks at the top of `styles.css`, and remove the Google Fonts `<link>` from `index.html`.

2. **Add Julie's portrait.** Save the image as `assets/julie.jpg` (or update the URL in `styles.css` under `.julie__photo`). Recommended size: ~1600×2000 px, JPG, under 500KB.

3. **Newsletter form.** The newsletter form does not require a database by default. If no Supabase config is present, it opens a mailto draft so leads are not lost. Supabase persistence is available through `notably-newsletter-signups.sql` if the site needs it later.

4. **Signature builder.** The private email signature utility lives at `signature.html`. It is intentionally excluded from navigation and uses `noindex, nofollow` metadata so search engines should not list it.

5. **Update links.** The mailto links currently point to `julie@notablyrecruit.com`. If the final email changes, update those links before launch. The "About Julie" links scroll to an in-page anchor — if that becomes a separate page, replace `#julie` with the live URL.

6. **Add analytics.** Drop in your analytics snippet (Plausible, Fathom, GA4) before `</head>` once the production measurement tool is chosen.

7. **Favicon.** Add a `favicon.ico` + apple-touch-icon to the root.

## Design tokens

All visual decisions are documented in `../design-tokens.md`. When something changes — new color, new spacing value, etc. — update that file first, then mirror it into the `:root` block at the top of `styles.css`.

## Browser support

Modern evergreen browsers (Chrome, Safari, Firefox, Edge). Uses `clamp()` for fluid type, CSS Grid for layout, and CSS custom properties. No polyfills shipped.

## Accessibility

- Semantic HTML throughout (`header`, `main`, `section`, `nav`, `footer`, `aside`, `figure`)
- Skip-friendly: the mobile menu uses `aria-expanded` + `aria-label`, the form has a `role="status"` live region
- All interactive elements are keyboard-accessible
- `prefers-reduced-motion` honored
- Run an axe or Lighthouse audit before launch — there's likely a contrast nit to tighten on the pastel highlights against dark text. If anything fails, the easiest fix is bumping `--c-off-black` text weight where it sits on yellow/mint/pink.
