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

assert.ok(robots.includes("Disallow: /notably/signature.html"), "Missing signature robots block");

console.log("Revision system contract verified.");
