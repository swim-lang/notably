# Notably — Email Signature

Email signature for **Julie Anich, Founder**.

## Files

| File | Purpose |
|---|---|
| `notably-signature.html` | The signature markup (email-safe table, inline styles) |
| `notably-icon.png` / `.svg` | The square Notably icon (left side) |
| `notably-wordmark.png` / `.svg` | The "Notably" wordmark (info block) |

## Layout

`[ icon ] │ [ wordmark + name + role + email + location ]` — the icon, the
divider line, and the info block are all the same height (121px) and aligned
top and bottom.

## Fonts (open-source, matched to the brand's Rhetorik family)

- **Name** → [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) — humanist sans, closest free match to *Rhetorik Sans*.
- **Role / email / location** → [Lora](https://fonts.google.com/specimen/Lora) — calligraphy-rooted serif, ≈ *Rhetorik Serif*.

Webfonts load in clients that support them (e.g. Apple Mail); Gmail/Outlook
fall back to Arial / Georgia via the built-in font stacks.

## Images

The HTML references the two PNGs by **relative path**. To send the signature,
the images must be reachable by the mail client — either:

1. **Host them** (e.g. enable GitHub Pages on this repo and use the published
   URLs in the `src` attributes), or
2. **Embed them as base64** for a fully self-contained file.

## Install (copy–paste method)

1. Open `notably-signature.html` in a browser.
2. Select all (⌘A) and copy (⌘C).
3. Paste into your mail client's signature editor:
   - **Gmail:** Settings → See all settings → General → Signature.
   - **Apple Mail:** Settings → Signatures → paste (uncheck "Always match my
     default message font").
   - **Outlook:** File → Options → Mail → Signatures.

Brand colors: `#272826` (ink) · `#f8f2a8` (yellow).
