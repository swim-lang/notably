# Paper Workflow Notes

## Source of Truth

- The Notably design exploration lives in Paper, not Pencil.
- Current board: `Notably Site · Paper`.
- Current file URL: `app.paper.design/file/01KRCEPNBFFXRP3YTZ86RBNYXT/1-0`.
- Treat Paper as the active design surface for section experiments before coding them into the static site.

## MCP First

- Paper has MCP support and should be accessed through the Paper MCP when design work is needed.
- Codex config already includes:
  - server name: `paper`
  - URL: `http://127.0.0.1:29979/mcp`
- Paper Desktop starts the local MCP server when the app/file is open.
- Do not default to Computer Use for Paper design tasks.
- Computer Use is only a last-resort visibility or app-focus fallback, not the normal way to create or edit Paper designs.
- If the Paper MCP is not visible in the current tool list, search/load the correct MCP tools before falling back.
- If the server is configured and Paper is open but the `mcp__paper__...` tools are still not exposed in a long-running Codex session, reconnect/restart the agent session so Codex reloads the MCP tool list.

## Editable Layers Only

- Create actual editable Paper layers: frames, rectangles, text, and native layout objects.
- Do not create SVG-based mockups for Paper section concepts.
- Do not paste screenshots or flattened images as design substitutes.
- If clipboard payloads are used, they must produce native editable Paper layers, not a single SVG/image layer.

## Notably Style Constraints

- Keep experiments aligned with the current Notably direction:
  - static website sections
  - light highlighter yellow accent
  - off-white background
  - off-black type and rules
  - editorial recruiting language
  - simple, client-reviewable layouts
- Favor concepts that can translate cleanly into `index-saturated.html` and `styles-saturated.css`.

## Current Candidate Section Direction

- Next Paper concept should explore a candidate-facing section anchored around open conversations or open roles.
- Avoid making it feel like a high-maintenance job board.
- Useful content blocks:
  - headline for candidates exploring accounting, finance, or tax opportunities
  - short explanation that some searches are confidential or not publicly listed
  - role/category cards such as Tax, Technical Accounting, FP&A, and Accounting Leadership
  - clear CTA to talk with Julie or send a resume
