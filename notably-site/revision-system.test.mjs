import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const html = read("index.html");
const script = read("script.js");
const styles = read("styles.css");
const signature = read("signature.html");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
const vercelConfig = read("../vercel.json");
const formsApi = read("../api/forms.js");

const expectedReviewIds = [
  "nav",
  "hero",
  "proof",
  "intro",
  "roles",
  "why",
  "value",
  "process",
  "callout",
  "audience",
  "pov",
  "rim",
  "julie",
  "newsletter",
  "final",
  "footer",
];

for (const id of expectedReviewIds) {
  assert.match(html, new RegExp(`data-review-id="${id}"`), `Missing review target: ${id}`);
}

for (const expected of [
  "notably-review-comments",
  "notably_review_comments",
  "reviewTextQuote",
  "renderReviewChoice",
  "renderReviewToolbar",
  "renderReviewPanel",
  "Leave Revisions",
  "Preview Website",
  "julie__media",
  "data-video-toggle",
  "focusSearchForm",
  "is-attention",
  ".review-mode-choice button",
]) {
  assert.match(script, new RegExp(expected), `Missing review script contract: ${expected}`);
}

for (const expected of [
  ".review-mode-choice",
  ".review-toolbar",
  ".review-popover",
  ".review-panel",
  "html[data-review-mode=\"comment\"] [data-review-id]",
  ".has-review-comment",
  ".julie__play",
  ".julie__media.is-playing",
  ".contact-form.is-attention #search-name",
  "search-field-attention",
]) {
  assert.ok(styles.includes(expected), `Missing review style: ${expected}`);
}

const sqlPath = join(root, "notably-review-comments.sql");
assert.equal(existsSync(sqlPath), true, "Missing Supabase schema file");

const sql = readFileSync(sqlPath, "utf8");
for (const expected of [
  "create table if not exists public.notably_review_comments",
  "author_name",
  "text_quote",
  "resolved_at",
  "allow anonymous notably review select",
  "allow anonymous notably review insert",
  "allow anonymous notably review status updates",
]) {
  assert.match(sql, new RegExp(expected), `Missing SQL contract: ${expected}`);
}

const newsletterSqlPath = join(root, "notably-newsletter-signups.sql");
assert.equal(existsSync(newsletterSqlPath), true, "Missing newsletter Supabase schema file");
const newsletterSql = readFileSync(newsletterSqlPath, "utf8");
for (const expected of [
  "create table if not exists public.notably_newsletter_signups",
  "email text not null",
  "allow anonymous notably newsletter insert",
]) {
  assert.ok(newsletterSql.includes(expected), `Missing newsletter schema contract: ${expected}`);
}

for (const expected of [
  '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />',
  "signature-logo-yellow.png",
  "Copy Signature",
  "Select Signature",
  "Copy HTML",
  "julie@notablyrecruit.com",
  "notablyrecruit.com",
  "Talent worth your attention",
  "ClipboardItem",
]) {
  assert.ok(signature.includes(expected), `Missing signature builder contract: ${expected}`);
}

for (const expected of [
  "https://notablyrecruit.com/signature.html",
  'const LIVE_BASE = "https://notablyrecruit.com/";',
]) {
  assert.ok(signature.includes(expected), `Missing production signature domain: ${expected}`);
}

for (const expected of [
  "https://notablyrecruit.com/",
  "https://notablyrecruit.com/assets/notably-social-preview.png",
  'property="og:image:width" content="1200"',
  'property="og:image:height" content="630"',
  'name="twitter:image:alt"',
  'name="theme-color" content="#F8F2A8"',
  '"@type": "EmploymentAgency"',
  "https://calendly.com/janich-rimrp/search-conversation",
  "/favicon.svg",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "assets/julie.jpg",
  "assets/julie-intro.mp4",
  "assets/julie-video-poster.jpg",
  "data-video-toggle",
  "data-video-jump",
  "julie__portrait",
  "Founder, Recruitment Services",
  "LinkedIn ↗",
  "A Short Note",
  "inbox__avatar--brand",
  'action="/api/forms"',
  'name="form_type" value="newsletter"',
]) {
  assert.ok(html.includes(expected), `Missing production home metadata: ${expected}`);
}

assert.ok(!html.includes("julie__video\" controls"), "Julie video should use custom controls");

for (const path of [
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "assets/notably-social-preview.png",
]) {
  assert.equal(existsSync(join(root, path)), true, `Missing favicon asset: ${path}`);
}

for (const expected of [
  "RESEND_API_KEY",
  "https://api.resend.com/emails",
  "NOTABLY_FORM_TO",
  "NOTABLY_FORM_FROM",
  "resend_not_configured",
  'type === "candidate"',
  "attachments",
  "MAX_RESUME_BYTES",
]) {
  assert.ok(formsApi.includes(expected), `Missing Resend forms contract: ${expected}`);
}

const candidate = read("find-job.html");
assert.ok(
  candidate.includes("https://calendly.com/janich-rimrp/introductory-conversation"),
  "Missing candidate Calendly link",
);
assert.ok(candidate.includes("/favicon.svg"), "Missing candidate favicon");
for (const expected of [
  'href="https://notablyrecruit.com/find-job"',
  "https://notablyrecruit.com/assets/notably-social-preview.png",
  'property="og:image:width" content="1200"',
  '"@type": "WebPage"',
  'href="#send-resume"',
  "data-candidate-form",
  'name="resume"',
  'accept=".pdf,.doc,.docx',
]) {
  assert.ok(candidate.includes(expected), `Missing candidate resume contract: ${expected}`);
}

const contact = read("contact.html");
for (const expected of [
  "/favicon.svg",
  'href="https://notablyrecruit.com/contact"',
  "https://notablyrecruit.com/assets/notably-social-preview.png",
  'property="og:image:width" content="1200"',
  '"@type": "ContactPage"',
  'action="/api/forms"',
  'name="form_type" value="search"',
  'name="website"',
  'href="#search-form"',
  'id="search-form"',
]) {
  assert.ok(contact.includes(expected), `Missing contact form contract: ${expected}`);
}

assert.ok(robots.includes("Disallow: /notably/signature.html"), "Missing signature robots block");
assert.ok(robots.includes("Disallow: /signature.html"), "Missing root-domain signature robots block");
assert.ok(robots.includes("Sitemap: https://notablyrecruit.com/sitemap.xml"), "Missing sitemap directive");

for (const expected of [
  "https://notablyrecruit.com/",
  "https://notablyrecruit.com/find-job",
  "https://notablyrecruit.com/contact",
]) {
  assert.ok(sitemap.includes(expected), `Missing sitemap URL: ${expected}`);
}

for (const expected of [
  '"outputDirectory": "notably-site"',
  '"buildCommand": null',
  '"source": "/signature"',
  '"X-Robots-Tag"',
]) {
  assert.ok(vercelConfig.includes(expected), `Missing Vercel config contract: ${expected}`);
}

console.log("Revision system contract verified.");
