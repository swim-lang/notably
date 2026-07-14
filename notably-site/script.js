// Notably — minimal client JS
// Toggle nav and handle lightweight static-site forms.

(function () {
  "use strict";

  const SITE_CONFIG = window.NOTABLY_REVIEW_CONFIG || {};
  const REVIEW_ENABLED = SITE_CONFIG.enabled === true;
  const SUPABASE_URL = (SITE_CONFIG.supabaseUrl || "").replace(/\/$/, "");
  const SUPABASE_ANON_KEY = SITE_CONFIG.supabaseAnonKey || "";
  const FORMS_ENDPOINT = "/api/forms";

  /* ─── Mobile nav toggle ────────────────────────────────────── */

  const toggle = document.querySelector(".nav__toggle");
  const menu = document.querySelector(".nav__mobile");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const isOpen = !menu.hasAttribute("hidden");
      if (isOpen) {
        menu.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      } else {
        menu.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
      }
    });

    // Close menu when a link inside is tapped
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ─── Newsletter form ──────────────────────────────────────── */
  //
  // Submit to the Vercel/Resend form endpoint first. If Resend is not
  // configured yet, fall back to a mailto draft so the lead is not lost.

  async function submitForm(payload) {
    const response = await fetch(FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source_path: `${window.location.pathname}${window.location.hash}`,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      const error = new Error(result.error || "Could not send form.");
      error.code = result.code || "form_error";
      throw error;
    }
    return result;
  }

  function openMailDraft(subject, lines) {
    const body = encodeURIComponent(lines.map(([label, value]) => (
      `${label}: ${(value || "").toString().trim() || "-"}`
    )).join("\n"));
    window.location.href = `mailto:julie@notablyrecruit.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  function readResume(file) {
    const maxBytes = 2.5 * 1024 * 1024;
    const allowedExtension = /\.(pdf|doc|docx)$/i;

    if (!file || !file.name) {
      return Promise.reject(new Error("Please choose a resume to upload."));
    }
    if (!allowedExtension.test(file.name)) {
      return Promise.reject(new Error("Please upload a PDF or Word document."));
    }
    if (file.size > maxBytes) {
      return Promise.reject(new Error("Please choose a resume smaller than 2.5 MB."));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const encoded = String(reader.result || "").split(",")[1];
        if (!encoded) {
          reject(new Error("Could not read that resume. Please try another file."));
          return;
        }
        resolve({ filename: file.name, content: encoded });
      });
      reader.addEventListener("error", () => {
        reject(new Error("Could not read that resume. Please try another file."));
      });
      reader.readAsDataURL(file);
    });
  }

  const form = document.querySelector("[data-newsletter]");
  if (form) {
    const input = form.querySelector("input[type=email]");
    const status = document.querySelector(".news__status");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = (input.value || "").trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (status) status.textContent = "Please enter a valid email.";
        input.focus();
        return;
      }

      if (status) status.textContent = "Saving...";

      try {
        await submitForm({
          type: "newsletter",
          email,
          website: form.elements.website?.value || "",
        });
        if (status) status.textContent = "Thanks — you're on the list.";
        input.value = "";
      } catch (error) {
        console.warn("Could not send newsletter signup.", error);
        if (status) status.textContent = "Opening an email draft as backup...";
        openMailDraft("Newsletter signup", [["Email", email]]);
      }
    });
  }

  /* ─── Start-a-search form ─────────────────────────────────── */
  //
  // Submit search details to Resend, with mailto fallback if the endpoint
  // is not configured yet.

  const searchForm = document.querySelector("[data-search-form]");
  if (searchForm) {
    const status = searchForm.querySelector(".contact-form__status");
    const firstField = searchForm.querySelector("#search-name");
    let attentionTimer;

    const focusSearchForm = () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      (firstField || searchForm).scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });

      searchForm.classList.remove("is-attention");
      void searchForm.offsetWidth;
      searchForm.classList.add("is-attention");

      window.setTimeout(() => firstField?.focus({ preventScroll: true }), reduceMotion ? 0 : 350);
      window.clearTimeout(attentionTimer);
      attentionTimer = window.setTimeout(() => searchForm.classList.remove("is-attention"), 1500);
    };

    document.querySelectorAll('a[href="#search-form"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.history.replaceState(null, "", "#search-form");
        focusSearchForm();
      });
    });

    if (window.location.hash === "#search-form") {
      window.setTimeout(focusSearchForm, 120);
    }

    document.addEventListener("click", (event) => {
      if (
        window.location.hash === "#search-form" &&
        event.target.closest(".review-mode-choice button")
      ) {
        window.setTimeout(focusSearchForm, 80);
      }
    });

    searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!searchForm.reportValidity()) return;

      const data = new FormData(searchForm);
      const lines = [
        ["Name", data.get("name")],
        ["Email", data.get("email")],
        ["Company", data.get("company")],
        ["Role or function", data.get("role")],
        ["Target compensation", data.get("target_compensation")],
        ["Timing", data.get("timing")],
        ["Context", data.get("context")],
      ]
        .map(([label, value]) => `${label}: ${(value || "").toString().trim() || "-"}`)
        .join("\n");

      if (status) status.textContent = "Sending...";

      try {
        await submitForm({
          type: "search",
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          role: data.get("role"),
          target_compensation: data.get("target_compensation"),
          timing: data.get("timing"),
          context: data.get("context"),
          website: data.get("website"),
        });
        if (status) status.textContent = "Thanks — Julie will follow up soon.";
        searchForm.reset();
      } catch (error) {
        console.warn("Could not send search form.", error);
        if (status) status.textContent = "Opening an email draft as backup...";
        openMailDraft("Starting a Search", [["Details", lines]]);
      }
    });
  }

  /* ─── Candidate resume form ───────────────────────────────── */

  const candidateForm = document.querySelector("[data-candidate-form]");
  if (candidateForm) {
    const status = candidateForm.querySelector(".contact-form__status");

    candidateForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!candidateForm.reportValidity()) return;

      const data = new FormData(candidateForm);
      const submitButton = candidateForm.querySelector("button[type=submit]");

      if (status) status.textContent = "Uploading securely...";
      if (submitButton) submitButton.disabled = true;

      try {
        const resume = await readResume(data.get("resume"));
        await submitForm({
          type: "candidate",
          name: data.get("name"),
          email: data.get("email"),
          linkedin: data.get("linkedin"),
          context: data.get("context"),
          website: data.get("website"),
          resume,
        });
        if (status) status.textContent = "Thanks — Julie received your resume.";
        candidateForm.reset();
      } catch (error) {
        console.warn("Could not send candidate resume.", error);
        if (status) status.textContent = error.message || "Could not send your resume. Please try again.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  /* ─── Julie intro video ───────────────────────────────────── */

  document.querySelectorAll(".julie__media").forEach((media) => {
    const video = media.querySelector(".julie__video");
    const button = media.querySelector("[data-video-toggle]");
    const label = button?.querySelector(".julie__play-text");
    if (!video || !button) return;

    const setVideoState = () => {
      const isPlaying = !video.paused && !video.ended;
      media.classList.toggle("is-playing", isPlaying);
      button.setAttribute("aria-pressed", isPlaying ? "true" : "false");
      button.setAttribute(
        "aria-label",
        `${isPlaying ? "Pause" : "Play"} Julie Anich introduction video`
      );
      if (label) label.textContent = isPlaying ? "Pause" : "Play video";
    };

    const toggleVideo = () => {
      if (video.paused || video.ended) {
        video.play().catch(() => setVideoState());
      } else {
        video.pause();
      }
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleVideo();
    });
    video.addEventListener("click", toggleVideo);
    video.addEventListener("play", setVideoState);
    video.addEventListener("pause", setVideoState);
    video.addEventListener("ended", setVideoState);
    setVideoState();
  });

  document.querySelectorAll("[data-video-jump]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const media = document.querySelector(".julie__media");
      const video = media?.querySelector(".julie__video");
      if (!media || !video) return;

      media.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
      video.play().catch(() => media.querySelector("[data-video-toggle]")?.focus());
    });
  });

  /* ─── Scroll-triggered reveals ─────────────────────────────── */
  //
  // Three patterns, two observers:
  //   • [data-role-grid]  — Role Grid card cascade. 25% threshold.
  //   • [data-line-sweep] — Process / Services divider cascade. 25%.
  //   • [data-pill-sweep] — individual highlight pills (Hero "Growing",
  //                         Callout "Right", POV "Quality", Final CTA
  //                         "Count?"). Observed on the pill element
  //                         itself at a 50% threshold so the sweep
  //                         fires when the pill is half on screen.
  //
  // Each element is observed once and unobserved after firing.

  const sectionTargets = document.querySelectorAll(
    "[data-role-grid], [data-line-sweep]"
  );
  const pillTargets = document.querySelectorAll("[data-pill-sweep]");

  if ("IntersectionObserver" in window) {
    // Sections (Role Grid, line sweep): fire once, then unobserve.
    const sectionObs = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          sectionObs.unobserve(entry.target);
        }
      }),
      { threshold: 0.25 }
    );
    // Pills: keep observing so the class toggles both ways. The
    // rootMargin extends the observation root upward to infinity,
    // so a pill that's already above the viewport (scrolled past)
    // still counts as "intersecting" — meaning it stays highlighted
    // when the user scrolls back up and the pill re-enters from the
    // top. The only moment .in-view changes is when the pill crosses
    // the 50% visibility line at the BOTTOM of the viewport:
    //   • Scrolling down past the pill → 50% visible from bottom →
    //     .in-view added → mask in from left.
    //   • Scrolling up past the pill → pill drops back below 50% →
    //     .in-view removed → mask out from right to left.
    // Top-edge entries/exits are no-ops, so the pill is always
    // "already behind the letters" when scrolled past going up.
    const pillObs = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);
      }),
      { rootMargin: "9999px 0px 0px 0px", threshold: 0.5 }
    );

    sectionTargets.forEach((el) => sectionObs.observe(el));
    pillTargets.forEach((el) => pillObs.observe(el));
  } else {
    // No IntersectionObserver support — reveal everything in place.
    sectionTargets.forEach((el) => el.classList.add("in-view"));
    pillTargets.forEach((el) => el.classList.add("in-view"));
  }

  /* ─── Intro pink highlight: scroll-linked growth ──────────── */
  //
  // The pink band behind the Intro divider grows in lockstep with
  // the highlighter's own viewport position:
  //   progress 0 = the highlighter just enters at the viewport bottom
  //   progress 1 = the highlighter is about to leave at the viewport top
  // Total scroll range over which it animates = viewport height +
  // highlighter height (the full pass).
  //
  // The highlighter is rendered as a ::before on .intro__body offset
  // from its top by (24px label * 1.55 line-height + 10px col gap −
  // 7px margin) ≈ 40.2px. We measure intro__body's rect and offset
  // by that constant to get the highlighter's effective top.

  const introBody = document.querySelector(".intro__body");
  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (introBody && !prefersReducedMotion) {
    const HIGHLIGHT_OFFSET = 24 * 1.55 + 10 - 7; // ≈ 40.2 px
    const HIGHLIGHT_HEIGHT = 14;
    let ticking = false;

    const update = () => {
      const rect = introBody.getBoundingClientRect();
      const vh = window.innerHeight;
      // Highlighter's top edge relative to viewport top.
      const highlightTop = rect.top + HIGHLIGHT_OFFSET;
      // Progress 0 when highlightTop == vh (just entering at bottom).
      // Progress 1 when highlightTop == vh / 4 (highlighter has
      // reached the upper quarter of the viewport). Range = 3 * vh / 4.
      const progress = Math.max(
        0,
        Math.min(1, (vh - highlightTop) / ((vh * 3) / 4))
      );
      introBody.style.setProperty("--intro-progress", progress.toFixed(4));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    let scrolling = false;
    if ("IntersectionObserver" in window) {
      // Only listen to scroll while the section is anywhere near the
      // viewport — keeps the scroll handler off the main thread when
      // the user is elsewhere on the page.
      const watcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !scrolling) {
              window.addEventListener("scroll", onScroll, { passive: true });
              scrolling = true;
            } else if (!entry.isIntersecting && scrolling) {
              window.removeEventListener("scroll", onScroll);
              scrolling = false;
            }
          });
        },
        { rootMargin: "200px 0px" }
      );
      watcher.observe(introBody);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    update();
  }

  /* ─── Smooth-scroll offset for sticky nav ──────────────────── */
  //
  // Sticky nav covers ~70px. When the user clicks an in-page anchor,
  // scroll a touch above the target so the section title isn't hidden.

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#" || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      const navHeight = document.querySelector(".nav")?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;

      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ─── Client revision layer ───────────────────────────────── */

  const REVIEW_STORAGE_KEY = "notably-review-comments";
  const REVIEW_TABLE = "notably_review_comments";
  const REVIEW_PAGE = "home";
  const REVIEW_SUPABASE_URL = SUPABASE_URL;
  const REVIEW_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  const HAS_REVIEW_SUPABASE = Boolean(REVIEW_SUPABASE_URL && REVIEW_SUPABASE_ANON_KEY);

  const reviewState = {
    mode: "",
    comments: [],
    activeTarget: null,
    panelOpen: false,
    notice: "",
    syncWarning: "",
    noticeTimer: null,
  };

  function reviewTextQuote(element) {
    return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 240);
  }

  function readLocalReviewComments() {
    try {
      return JSON.parse(window.localStorage.getItem(REVIEW_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeLocalReviewComments(items) {
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(items, null, 2));
  }

  function toReviewComment(row) {
    return {
      id: row.id,
      page: row.page || REVIEW_PAGE,
      path: row.path || "/",
      reviewId: row.review_id,
      selector: row.selector,
      textQuote: row.text_quote || "",
      authorName: row.author_name || "",
      comment: row.comment,
      status: row.status || "open",
      viewport: row.viewport || null,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || null,
    };
  }

  function toReviewRow(item) {
    return {
      id: item.id,
      page: item.page,
      path: item.path,
      review_id: item.reviewId,
      selector: item.selector,
      text_quote: item.textQuote,
      author_name: item.authorName || null,
      comment: item.comment,
      status: item.status,
      viewport: item.viewport,
      created_at: item.createdAt,
      resolved_at: item.resolvedAt || null,
    };
  }

  async function reviewRequest(path, options = {}) {
    const response = await fetch(`${REVIEW_SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: REVIEW_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${REVIEW_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return [];
    return response.json();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setReviewMode(mode) {
    reviewState.mode = mode;
    reviewState.activeTarget = null;
    document.documentElement.dataset.reviewMode = mode === "view" ? "" : mode;
    document.querySelector(".review-mode-choice")?.remove();
    document.querySelector(".review-popover")?.remove();

    if (mode === "view") {
      document.querySelector(".review-toolbar")?.remove();
      document.querySelector(".review-panel")?.remove();
      return;
    }

    loadReviewComments();
    renderReviewToolbar();
  }

  function renderReviewChoice() {
    const layer = el("div", "review-mode-choice review-layer");
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    layer.setAttribute("aria-label", "Notably private preview options");

    const card = el("div", "review-mode-card");
    card.append(el("span", "", "Private Preview"));
    card.append(el("h2", "", "How would you like to review the site?"));
    card.append(el("p", "", "Preview the website normally, or leave revisions directly on page sections so feedback stays organized."));

    const actions = el("div", "review-mode-actions");
    const preview = el("button", "", "Preview Website");
    preview.type = "button";
    preview.addEventListener("click", () => setReviewMode("view"));
    const revisions = el("button", "", "Leave Revisions");
    revisions.type = "button";
    revisions.addEventListener("click", () => setReviewMode("browse"));
    actions.append(preview, revisions);
    card.append(actions);
    layer.append(card);
    document.body.append(layer);
  }

  function renderReviewToolbar() {
    document.querySelector(".review-toolbar")?.remove();
    const toolbar = el("div", "review-toolbar review-layer");
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Review tools");

    const openCount = reviewState.comments.filter((item) => item.status !== "resolved").length;
    const buttons = [
      ["browse", "Browse", () => setReviewMode("browse")],
      ["comment", "Comment", () => setReviewMode("comment")],
      ["panel", `Comments ${openCount}`, () => {
        reviewState.panelOpen = !reviewState.panelOpen;
        renderReviewPanel();
      }],
      ["export", "Export", exportReviewComments],
    ];

    buttons.forEach(([name, label, action]) => {
      const button = el("button", reviewState.mode === name ? "active" : "", label);
      button.type = "button";
      button.addEventListener("click", action);
      toolbar.append(button);
    });

    document.body.append(toolbar);
    updateReviewTargetStates();
    renderReviewPanel();
  }

  function renderReviewPopover() {
    document.querySelector(".review-popover")?.remove();
    const target = reviewState.activeTarget;
    if (!target) return;

    const form = el("form", "review-popover review-layer");
    form.style.top = `${target.top}px`;
    form.style.left = `${target.left}px`;
    form.append(el("div", "review-popover-meta", target.reviewId));

    const name = el("input", "review-author");
    name.name = "authorName";
    name.placeholder = "Your name (optional)";
    name.autocomplete = "name";

    const textarea = el("textarea");
    textarea.name = "comment";
    textarea.placeholder = "Leave a revision note";
    textarea.required = true;

    const actions = el("div", "review-popover-actions");
    const cancel = el("button", "", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      reviewState.activeTarget = null;
      renderReviewPopover();
    });
    const save = el("button", "", "Save");
    save.type = "submit";
    actions.append(cancel, save);

    form.append(name, textarea, actions);
    form.addEventListener("submit", saveReviewComment);
    document.body.append(form);
    textarea.focus();
  }

  function renderReviewPanel() {
    document.querySelector(".review-panel")?.remove();
    if (!reviewState.panelOpen) return;

    const panel = el("aside", "review-panel review-layer");
    panel.setAttribute("aria-label", "Review comments");

    const header = el("div", "review-panel-header");
    const titleGroup = el("div");
    titleGroup.append(el("span", "", "Notably Review"));
    titleGroup.append(el("h2", "", "Comments"));
    titleGroup.append(el("small", "", HAS_REVIEW_SUPABASE ? "Synced with Supabase" : "Local backup mode"));
    const close = el("button", "", "Close");
    close.type = "button";
    close.addEventListener("click", () => {
      reviewState.panelOpen = false;
      renderReviewPanel();
    });
    header.append(titleGroup, close);
    panel.append(header);

    if (reviewState.syncWarning) {
      panel.append(el("p", "review-sync-warning", reviewState.syncWarning));
    }

    const list = el("div", "review-panel-list");
    if (!reviewState.comments.length) {
      list.append(el("p", "review-panel-empty", "No comments yet. Switch to Comment and click a section."));
    } else {
      reviewState.comments.forEach((item) => list.append(renderReviewPanelItem(item)));
    }
    panel.append(list);
    document.body.append(panel);
  }

  function renderReviewPanelItem(item) {
    const article = el("article", `review-panel-item ${item.status === "resolved" ? "is-resolved" : ""}`.trim());
    article.append(el("div", "review-panel-meta", `${item.reviewId} · ${item.status}`));
    if (item.authorName) article.append(el("strong", "review-panel-author", item.authorName));
    if (item.textQuote) article.append(el("p", "review-panel-quote", `"${item.textQuote}"`));
    article.append(el("p", "", item.comment));
    article.append(el("small", "", new Date(item.createdAt).toLocaleString()));

    const actions = el("div", "review-panel-actions");
    const jump = el("button", "", "Jump");
    jump.type = "button";
    jump.addEventListener("click", () => jumpToReviewComment(item));
    actions.append(jump);

    if (item.status !== "resolved") {
      const resolve = el("button", "", "Resolve");
      resolve.type = "button";
      resolve.addEventListener("click", () => resolveReviewComment(item.id));
      actions.append(resolve);
    }
    article.append(actions);
    return article;
  }

  async function loadReviewComments() {
    if (!HAS_REVIEW_SUPABASE) {
      reviewState.syncWarning = "Saving locally until Supabase review config is added.";
      reviewState.comments = readLocalReviewComments();
      renderReviewToolbar();
      return;
    }

    try {
      const rows = await reviewRequest(`${REVIEW_TABLE}?select=*&order=created_at.desc`);
      reviewState.syncWarning = "";
      reviewState.comments = rows.map(toReviewComment);
      writeLocalReviewComments(reviewState.comments);
    } catch (error) {
      console.warn("Could not load Notably review comments.", error);
      reviewState.syncWarning = "Could not sync comments. Saving locally for now.";
      reviewState.comments = readLocalReviewComments();
    }
    renderReviewToolbar();
  }

  function persistReviewComments(items) {
    reviewState.comments = items;
    writeLocalReviewComments(items);
    updateReviewTargetStates();
    renderReviewToolbar();
  }

  async function saveReviewComment(event) {
    event.preventDefault();
    const target = reviewState.activeTarget;
    const form = event.currentTarget;
    const comment = form.elements.comment.value.trim();
    const authorName = form.elements.authorName.value.trim();
    if (!target || !comment) return;

    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      page: REVIEW_PAGE,
      path: `${window.location.pathname}${window.location.hash}`,
      reviewId: target.reviewId,
      selector: target.selector,
      textQuote: target.textQuote,
      authorName,
      comment,
      status: "open",
      viewport: { width: window.innerWidth, height: window.innerHeight },
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    const nextComments = [item, ...reviewState.comments];
    reviewState.activeTarget = null;
    reviewState.panelOpen = true;
    persistReviewComments(nextComments);
    renderReviewPopover();

    if (!HAS_REVIEW_SUPABASE) {
      showReviewNotice("Comment saved locally.");
      return;
    }

    try {
      const rows = await reviewRequest(REVIEW_TABLE, { method: "POST", body: JSON.stringify(toReviewRow(item)) });
      const saved = rows[0] ? toReviewComment(rows[0]) : item;
      persistReviewComments(nextComments.map((commentItem) => (commentItem.id === item.id ? saved : commentItem)));
      showReviewNotice("Comment saved.");
    } catch (error) {
      console.warn("Could not save Notably review comment.", error);
      reviewState.syncWarning = "Could not sync comments. Saved locally for now.";
      renderReviewPanel();
      showReviewNotice("Saved locally.");
    }
  }

  async function resolveReviewComment(id) {
    const resolvedAt = new Date().toISOString();
    const nextComments = reviewState.comments.map((item) => (
      item.id === id ? { ...item, status: "resolved", resolvedAt } : item
    ));
    persistReviewComments(nextComments);

    if (!HAS_REVIEW_SUPABASE) return;
    try {
      await reviewRequest(`${REVIEW_TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved", resolved_at: resolvedAt }),
      });
    } catch (error) {
      console.warn("Could not resolve Notably review comment remotely.", error);
      reviewState.syncWarning = "Could not sync comment status. Local status updated.";
      renderReviewPanel();
    }
  }

  function jumpToReviewComment(item) {
    const target = document.querySelector(item.selector);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("review-jump");
    window.setTimeout(() => target.classList.remove("review-jump"), 1600);
  }

  function exportReviewComments() {
    const blob = new Blob([JSON.stringify(reviewState.comments, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `notably-review-comments-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function updateReviewTargetStates() {
    document.querySelectorAll("[data-review-id]").forEach((node) => {
      const hasComment = reviewState.comments.some((item) => (
        item.status !== "resolved" && item.reviewId === node.dataset.reviewId
      ));
      node.classList.toggle("has-review-comment", hasComment);
    });
  }

  function showReviewNotice(message) {
    reviewState.notice = message;
    window.clearTimeout(reviewState.noticeTimer);
    document.querySelector(".review-toast")?.remove();
    const toast = el("div", "review-toast review-layer", message);
    document.body.append(toast);
    reviewState.noticeTimer = window.setTimeout(() => {
      toast.remove();
      reviewState.notice = "";
    }, 2600);
  }

  document.addEventListener("click", (event) => {
    if (reviewState.mode !== "comment") return;
    if (event.target.closest(".review-layer")) return;
    const target = event.target.closest("[data-review-id]");
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = target.getBoundingClientRect();
    reviewState.activeTarget = {
      reviewId: target.dataset.reviewId,
      selector: `[data-review-id="${target.dataset.reviewId}"]`,
      textQuote: reviewTextQuote(target),
      top: Math.min(window.innerHeight - 260, Math.max(16, rect.top + 12)),
      left: Math.min(window.innerWidth - 392, Math.max(16, rect.left + 12)),
    };
    renderReviewPopover();
  }, true);

  if (REVIEW_ENABLED) {
    renderReviewChoice();
  }

})();
