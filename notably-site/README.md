# Notably — Site

A static marketing site for Notably (Julie Anich, accounting/finance/tax recruiting). One page, no build step, deployable anywhere.

## Files

```
notably-site/
├── index.html       Semantic markup for all 17 sections + nav/footer.
├── styles.css       Design tokens + responsive layout. Mirrors design-tokens.md.
├── script.js        Mobile-nav toggle, Resend-ready form handling, anchor scroll.
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

3. **Forms + Resend.** Newsletter signups, search inquiries, and candidate resumes post to `/api/forms`, a Vercel Function that sends via Resend. Candidate resumes are accepted as PDF or Word files up to 2.5 MB and arrive as email attachments. Add these Vercel production environment variables before treating the forms as fully live:

   ```bash
   RESEND_API_KEY=re_...
   NOTABLY_FORM_TO=julie@notablyrecruit.com
   NOTABLY_FORM_FROM="Notably <onboarding@resend.dev>"
   ```

   Use `onboarding@resend.dev` while testing. After `notablyrecruit.com` is verified in Resend, switch `NOTABLY_FORM_FROM` to a verified sender such as `Notably <hello@notablyrecruit.com>`. Newsletter and search forms retain a prefilled email-draft fallback; resume delivery requires Resend because browsers cannot attach a local file to an email draft automatically.

4. **Signature builder.** The private email signature utility lives at `signature.html`. It is intentionally excluded from navigation and uses `noindex, nofollow` metadata so search engines should not list it.

5. **Update links.** Julie's displayed email address and the contact-page "Email Julie" button route to the on-site search form so they work without a configured desktop mail app. The "About Julie" links scroll to an in-page anchor — if that becomes a separate page, replace `#julie` with the live URL.

6. **Add analytics.** Drop in your analytics snippet (Plausible, Fathom, GA4) before `</head>` once the production measurement tool is chosen.

7. **Favicon.** The root favicon bundle is generated from the Notably mark: `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, and `icon-192.png`.

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
