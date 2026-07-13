const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FALLBACK_TO = "julie@notablyrecruit.com";
const FALLBACK_FROM = "Notably <onboarding@resend.dev>";
const MAX_RESUME_BYTES = 2.5 * 1024 * 1024;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function clean(value, maxLength = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value, 5000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readResume(payload) {
  const resume = payload.resume;
  if (!resume || typeof resume !== "object") {
    return { error: "Please attach your resume." };
  }

  const filename = String(resume.filename || "")
    .replace(/[^a-zA-Z0-9._ ()-]/g, "")
    .trim()
    .slice(0, 180);
  const content = String(resume.content || "").replace(/\s/g, "");

  if (!filename || !/\.(pdf|doc|docx)$/i.test(filename)) {
    return { error: "Please attach a PDF or Word document." };
  }
  if (!content) {
    return { error: "The attached resume is empty." };
  }

  const bytes = Buffer.from(content, "base64");
  if (!bytes.length || bytes.length > MAX_RESUME_BYTES) {
    return { error: "Please attach a resume smaller than 2.5 MB." };
  }

  return { attachment: { filename, content } };
}

async function readBody(req) {
  const parseRaw = (raw) => {
    if (!raw) return {};

    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/json")) return JSON.parse(raw);
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return Object.fromEntries(new URLSearchParams(raw));
    }
    return { message: raw };
  };

  if (req.body) {
    if (Buffer.isBuffer(req.body)) return parseRaw(req.body.toString("utf8"));
    if (typeof req.body === "string") return parseRaw(req.body);
    if (typeof req.body === "object") return req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return parseRaw(chunks.map((chunk) => chunk.toString()).join(""));
}

function buildEmail(payload) {
  const type = clean(payload.type || payload.form_type || "search", 40);
  const source = clean(payload.source_path || payload.source || "notablyrecruit.com", 240);
  const email = clean(payload.email, 240).toLowerCase();

  if (!isEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (clean(payload.website, 240)) {
    return { skip: true };
  }

  if (type === "newsletter") {
    const rows = [
      ["Email", email],
      ["Source", source],
    ];
    return {
      replyTo: email,
      subject: "New Notably newsletter signup",
      text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
      html: rowsToHtml("New newsletter signup", rows),
    };
  }

  if (type === "candidate") {
    const name = clean(payload.name, 180);
    const linkedin = clean(payload.linkedin, 500);
    const context = clean(payload.context, 2400);
    const resume = readResume(payload);

    if (!name || !context) {
      return { error: "Please include your name and what you are looking for next." };
    }
    if (resume.error) return resume;

    const rows = [
      ["Name", name],
      ["Email", email],
      ["LinkedIn", linkedin],
      ["Looking for", context],
      ["Resume", resume.attachment.filename],
      ["Source", source],
    ];
    return {
      replyTo: email,
      subject: `New Notably candidate: ${name}`,
      text: rows.map(([label, value]) => `${label}: ${value || "-"}`).join("\n"),
      html: rowsToHtml("New candidate introduction", rows),
      attachments: [resume.attachment],
    };
  }

  const rows = [
    ["Name", clean(payload.name, 180)],
    ["Email", email],
    ["Company", clean(payload.company, 180)],
    ["Role or function", clean(payload.role, 220)],
    ["Target compensation", clean(payload.target_compensation, 180)],
    ["Timing", clean(payload.timing, 120)],
    ["Context", clean(payload.context, 2400)],
    ["Source", source],
  ];

  if (!rows[0][1] || !rows[6][1]) {
    return { error: "Please include your name and a little context." };
  }

  return {
    replyTo: email,
    subject: "New Notably search inquiry",
    text: rows.map(([label, value]) => `${label}: ${value || "-"}`).join("\n"),
    html: rowsToHtml("New search inquiry", rows),
  };
}

function rowsToHtml(title, rows) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#272826">
      <h1 style="font-size:22px;font-weight:500;margin:0 0 18px">${escapeHtml(title)}</h1>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="border-top:1px solid #e6e1c6;padding:10px 14px 10px 0;color:#6b6758;width:180px;vertical-align:top">${escapeHtml(label)}</td>
            <td style="border-top:1px solid #e6e1c6;padding:10px 0;vertical-align:top">${escapeHtml(value || "-")}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const payload = await readBody(req);
    const email = buildEmail(payload);

    if (email.skip) return json(res, 200, { ok: true });
    if (email.error) return json(res, 400, { ok: false, error: email.error });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return json(res, 503, {
        ok: false,
        code: "resend_not_configured",
        error: "Resend is not configured yet.",
      });
    }

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTABLY_FORM_FROM || FALLBACK_FROM,
        to: process.env.NOTABLY_FORM_TO || FALLBACK_TO,
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.attachments ? { attachments: email.attachments } : {}),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(res, 502, {
        ok: false,
        code: "resend_send_failed",
        error: result.message || "Resend could not send the email.",
      });
    }

    return json(res, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("Notably form error", error);
    return json(res, 500, { ok: false, error: "Could not send the form." });
  }
};
