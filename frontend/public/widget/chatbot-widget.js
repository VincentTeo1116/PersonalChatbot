/**
 * Portfolio Chatbot Widget — drop-in, framework-agnostic.
 *
 * Usage (plain HTML / any framework that allows a <script> tag):
 *
 *   <script
 *     src="chatbot-widget.js"
 *     data-api-url="https://your-backend.example.com/api/chat"
 *     data-owner-name="Vincent"
 *     data-primary-color="#4f46e5"
 *     data-greeting="Hi! Ask me anything about Vincent's background, skills, or projects."
 *   ></script>
 *
 * Or configure via a global object set BEFORE this script loads (useful when
 * bundling, or when you don't want config in markup):
 *
 *   <script>
 *     window.PortfolioChatbotConfig = { apiUrl: "...", ownerName: "Vincent" };
 *   </script>
 *   <script src="chatbot-widget.js"></script>
 *
 * The widget auto-injects its own stylesheet (chatbot-widget.css, resolved
 * relative to this script's URL) unless data-no-css="true" is set, in which
 * case you must include the CSS yourself.
 */
(function () {
  "use strict";

  var scriptEl = document.currentScript;

  function readConfig() {
    var attrConfig = {};
    if (scriptEl) {
      attrConfig = {
        apiUrl: scriptEl.getAttribute("data-api-url"),
        ownerName: scriptEl.getAttribute("data-owner-name"),
        primaryColor: scriptEl.getAttribute("data-primary-color"),
        greeting: scriptEl.getAttribute("data-greeting"),
        noCss: scriptEl.getAttribute("data-no-css") === "true",
      };
    }
    // Drop keys the script tag didn't actually set (getAttribute returns null),
    // so they don't clobber defaults/globalConfig with null during the merge below.
    Object.keys(attrConfig).forEach(function (k) {
      if (attrConfig[k] === null) delete attrConfig[k];
    });

    var starterQuestionsAttr = scriptEl && scriptEl.getAttribute("data-starter-questions");
    if (starterQuestionsAttr) {
      // Pipe-delimited (not comma) since a question can itself contain a comma.
      attrConfig.starterQuestions = starterQuestionsAttr
        .split("|")
        .map(function (q) {
          return q.trim();
        })
        .filter(Boolean);
    }

    var globalConfig = window.PortfolioChatbotConfig || {};
    return Object.assign(
      {
        apiUrl: "http://localhost:8080/api/chat",
        ownerName: "me",
        primaryColor: "#4f46e5",
        greeting: "Hi! Ask me anything about my background, skills, or projects.",
        noCss: false,
        starterQuestions: [
          "What projects have you built?",
          "What's your tech stack?",
          "Tell me about your work experience",
          "How can I get in touch?",
        ],
      },
      attrConfig,
      globalConfig
    );
  }

  /** Derives the streaming endpoint from the configured chat URL, e.g.
   * ".../api/chat" -> ".../api/chat/stream". Returns null if apiUrl can't be parsed
   * as a URL at all, in which case the caller falls back to the non-streaming call. */
  function buildStreamUrl(apiUrl) {
    try {
      var u = new URL(apiUrl, window.location.href);
      u.pathname = u.pathname.replace(/\/+$/, "") + "/stream";
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  /** Derives the backend's health-check URL from the configured chat URL, e.g.
   * ".../api/chat" -> ".../health". Returns null if apiUrl can't be parsed. */
  function buildHealthUrl(apiUrl) {
    try {
      var u = new URL(apiUrl, window.location.href);
      u.pathname = "/health";
      u.search = "";
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  // Free-tier hosts (e.g. Render) put the backend to sleep after a period of no
  // traffic; the first request afterward triggers a cold start that can take up to
  // ~60s. These tune the status dot's state machine so a visitor sees "waking up"
  // instead of the widget just silently hanging.
  var HEALTH_WAKE_RETRY_MS = 4000; // how often to re-check while waking up
  var HEALTH_WAKE_TIMEOUT_MS = 90000; // give up calling it "waking" after this long
  var HEALTH_OFFLINE_RETRY_MS = 30000; // how often to re-check once given up
  var HEALTH_KEEPALIVE_MS = 4 * 60 * 1000; // how often to re-check once confirmed online

  function injectStylesheet() {
    if (!scriptEl || !scriptEl.src) return;
    var href = new URL("chatbot-widget.css", scriptEl.src).toString();
    if (document.querySelector('link[data-pcw-styles]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-pcw-styles", "true");
    document.head.appendChild(link);
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  // Renders the answer's **bold** markers as <strong> using DOM nodes only (never innerHTML), so answer text can't inject markup.
  function renderRich(node, text) {
    node.textContent = "";
    String(text).split(/(\*\*[^*\n]+?\*\*)/).forEach(function (part) {
      if (/^\*\*[^*\n]+\*\*$/.test(part)) {
        node.appendChild(el("strong", "", { text: part.slice(2, -2) }));
      } else if (part) {
        node.appendChild(document.createTextNode(part));
      }
    });
  }

  // Only same-site paths ("/projects/x", "/#about") are linked; anything else a source might carry is shown as plain text.
  function isSitePath(url) {
    return typeof url === "string" && /^\/(?!\/)/.test(url);
  }

  // Replies that admit they have no answer -- worth offering a way to reach the owner directly.
  var UNKNOWN_RE = /(don't|do not|doesn't|does not|didn't|did not) (have|know|see|find)|no (such )?(information|info|details)|not (sure|certain)|couldn't find|can't find|cannot find|unable to (find|answer)|reach out/i;

  // ".../api/chat" -> ".../api/chat/feedback"; null if the URL can't be parsed.
  function buildFeedbackUrl(apiUrl) {
    try {
      var u = new URL(apiUrl, window.location.href);
      u.pathname = u.pathname.replace(/\/+$/, "") + "/feedback";
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  function ChatbotWidget(config) {
    this.config = config;
    this.isOpen = false;
    this.isLoading = false;
    this.status = null; // "waking" | "online" | "offline", set by _startHealthMonitor
    this._build();
    this._startHealthMonitor();
  }

  ChatbotWidget.prototype._build = function () {
    var self = this;

    if (this.config.primaryColor) {
      document.documentElement.style.setProperty("--pcw-primary", this.config.primaryColor);
    }

    this.launcher = el("button", "pcw-launcher", {
      "aria-label": "Open chat with " + this.config.ownerName + "'s assistant",
      "aria-expanded": "false",
      type: "button",
    });
    var launcherIcon = el("span");
    launcherIcon.innerHTML = "&#128172;"; // speech balloon emoji, safe static markup
    this.launcher.appendChild(launcherIcon);
    this.launcherDot = el("span", "pcw-status-dot", { "aria-hidden": "true" });
    this.launcher.appendChild(this.launcherDot);
    this.launcher.addEventListener("click", function () {
      self.toggle();
    });

    this.panel = el("div", "pcw-panel", { role: "dialog", "aria-label": "Chat" });
    this.panel.inert = true;

    this._defaultSubtitle = "AI assistant · answers from my portfolio";
    var header = el("div", "pcw-header");
    var headerText = el("div");
    headerText.appendChild(el("div", "pcw-header-title", { text: "Ask " + this.config.ownerName }));
    var subtitleRow = el("div", "pcw-header-subtitle");
    this.headerDot = el("span", "pcw-status-dot", { "aria-hidden": "true" });
    this.headerSubtitleText = el("span", null, { text: this._defaultSubtitle });
    subtitleRow.appendChild(this.headerDot);
    subtitleRow.appendChild(this.headerSubtitleText);
    headerText.appendChild(subtitleRow);
    var closeBtn = el("button", "pcw-close", { "aria-label": "Close chat", type: "button", text: "×" });
    closeBtn.addEventListener("click", function () {
      self.close();
    });
    header.appendChild(headerText);
    header.appendChild(closeBtn);

    this.messagesEl = el("div", "pcw-messages", { role: "log", "aria-live": "polite" });

    var inputRow = el("div", "pcw-input-row");
    this.inputEl = el("textarea", "pcw-input", {
      rows: "1",
      placeholder: "Type a question…",
      "aria-label": "Message",
    });
    this.inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        self._send();
      }
    });
    this.sendBtn = el("button", "pcw-send", { type: "button", "aria-label": "Send message", text: "➤" });
    this.sendBtn.addEventListener("click", function () {
      self._send();
    });
    inputRow.appendChild(this.inputEl);
    inputRow.appendChild(this.sendBtn);

    this.panel.appendChild(header);
    this.panel.appendChild(this.messagesEl);
    this.panel.appendChild(inputRow);

    document.body.appendChild(this.launcher);
    document.body.appendChild(this.panel);

    this._addMessage("bot", this.config.greeting);
    this._addSuggestions();
  };

  ChatbotWidget.prototype.toggle = function () {
    if (this.isOpen) this.close();
    else this.open();
  };

  ChatbotWidget.prototype.open = function () {
    this.isOpen = true;
    this.panel.inert = false;
    this.panel.classList.add("pcw-panel--open");
    this.launcher.setAttribute("aria-expanded", "true");
    this.inputEl.focus();
  };

  ChatbotWidget.prototype.close = function () {
    this.isOpen = false;
    this.panel.inert = true;
    this.panel.classList.remove("pcw-panel--open");
    this.launcher.setAttribute("aria-expanded", "false");
  };

  // Public, intentional entry point for the evaluation lab: prefill for review, never auto-send.
  ChatbotWidget.prototype.prefillQuestion = function (question) {
    var value = String(question || "").trim().slice(0, 500);
    if (!value) return;
    this.open();
    this.inputEl.value = value;
    this.inputEl.focus();
  };

  ChatbotWidget.prototype._addMessage = function (role, text) {
    var bubble = el("div", "pcw-msg pcw-msg-" + role);
    if (role === "bot") renderRich(bubble, text);
    else bubble.textContent = text;
    this.messagesEl.appendChild(bubble);
    this._scrollToBottom();
    return bubble;
  };

  ChatbotWidget.prototype._addSuggestions = function () {
    var self = this;
    var questions = this.config.starterQuestions;
    if (!questions || !questions.length) return;

    var wrap = el("div", "pcw-suggestions");
    questions.forEach(function (q) {
      var chip = el("button", "pcw-suggestion-chip", { type: "button", text: q });
      chip.addEventListener("click", function () {
        self.inputEl.value = q;
        self._send();
      });
      wrap.appendChild(chip);
    });
    this.messagesEl.appendChild(wrap);
    this.suggestionsEl = wrap;
    this._scrollToBottom();
  };

  ChatbotWidget.prototype._removeSuggestions = function () {
    if (this.suggestionsEl && this.suggestionsEl.parentNode) {
      this.suggestionsEl.parentNode.removeChild(this.suggestionsEl);
    }
    this.suggestionsEl = null;
  };

  ChatbotWidget.prototype._addSources = function (sources, data) {
    if (data && data.meeting_prefill) return;
    sources = sources || [];
    var self = this;
    var wrap = el("div", "pcw-sources");
    if (sources.length) {
      var pills = el("div", "pcw-source-pills");
      sources.forEach(function (s) {
        var label = s.label || s.category || "Source";
        if (isSitePath(s.url)) {
          var link = el("a", "pcw-source-pill pcw-source-link", { href: s.url, text: label });
          if (s.url.indexOf("/#") !== 0) {
            link.target = "_blank";
            link.rel = "noopener";
          } else {
            link.addEventListener("click", function () { self.close(); });
          }
          pills.appendChild(link);
        } else {
          pills.appendChild(el("span", "pcw-source-pill", { text: label }));
        }
      });
      wrap.appendChild(pills);
    }

    var inspect = el("details", "pcw-inspect");
    var summary = el("summary", "pcw-inspect-summary");
    var icon = el("span", "pcw-inspect-icon", { "aria-hidden": "true" });
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5M18.5 3v3m-1.5-1.5h3"/></svg>';
    summary.appendChild(icon);
    summary.appendChild(el("span", "", { text: "Inspect answer" }));
    summary.appendChild(el("span", "pcw-inspect-chevron", { "aria-hidden": "true" }));
    inspect.appendChild(summary);
    var body = el("div", "pcw-inspect-body");
    var metrics = el("div", "pcw-inspect-metrics");
    var ms = Number(data && data.latency_ms);
    if (Number.isFinite(ms) && ms >= 0) {
      metrics.appendChild(el("span", "pcw-inspect-metric", { text: "Server time: " + (ms < 1000 ? Math.round(ms) + " ms" : (ms / 1000).toFixed(1) + " s") }));
    }
    if (data && data.cache_hit) metrics.appendChild(el("span", "pcw-inspect-metric", { text: "Saved answer" }));
    if (metrics.childNodes.length) body.appendChild(metrics);
    if (sources.length) {
      body.appendChild(el("p", "pcw-inspect-note", { text: "These are selected portfolio entries. Similarity measures relatedness, not whether every claim is correct. Server time excludes browser and network delay." }));
      var list = el("ol", "pcw-inspect-list");
      sources.forEach(function (s, index) {
        var item = el("li", "pcw-inspect-source");
        var head = el("div", "pcw-inspect-source-head");
        head.appendChild(el("strong", "", { text: (index + 1) + ". " + (s.label || s.category || "Portfolio entry") }));
        if (typeof s.score === "number" && Number.isFinite(s.score)) {
          head.appendChild(el("span", "", { text: "Similarity " + s.score.toFixed(3) }));
        }
        item.appendChild(head);
        if (s.snippet) item.appendChild(el("p", "", { text: s.snippet }));
        if (isSitePath(s.url)) {
          var sourceLink = el("a", "pcw-inspect-link", { href: s.url, text: "Read this source ↗" });
          if (s.url.indexOf("/#") !== 0) {
            sourceLink.target = "_blank";
            sourceLink.rel = "noopener";
          } else {
            sourceLink.addEventListener("click", function () { self.close(); });
          }
          item.appendChild(sourceLink);
        }
        list.appendChild(item);
      });
      body.appendChild(list);
    } else {
      body.appendChild(el("p", "pcw-inspect-note", { text: "No portfolio entry passed the retrieval cutoff for this answer. Please treat it as unverified and ask Vincent directly if it matters to you." }));
    }
    body.appendChild(el("a", "pcw-inspect-lab-link", { href: "/ai-lab", text: "Explore the AI evaluation lab ↗" }));
    inspect.appendChild(body);
    inspect.addEventListener("toggle", function () { self._scrollToBottom(); });
    wrap.appendChild(inspect);
    this.messagesEl.appendChild(wrap);
    this._scrollToBottom();
  };

  // Under each answer: thumbs up/down (logged for the owner to review) and, when the bot had no real answer or got a thumbs-down,
  // a prompt to contact the owner directly so the visitor is never left at a dead end.
  ChatbotWidget.prototype._addFollowUps = function (question, data) {
    if (data.meeting_prefill) return;
    var self = this;
    var answer = String(data.answer || "").replace(/\*\*/g, "");
    var hasSources = !!(data.sources && data.sources.length);
    var wrap = el("div", "pcw-followups");
    var ctaShown = false;

    function showCta() {
      if (ctaShown) return;
      ctaShown = true;
      var owner = self.config.ownerName || "the owner";
      var cta = el("div", "pcw-contact-cta");
      cta.appendChild(el("p", "", { text: "Want a direct answer? Get in touch with " + owner + "." }));
      var row = el("div", "pcw-contact-cta-row");
      var meet = el("button", "pcw-cta-btn pcw-cta-primary", { type: "button", text: "Request a meeting" });
      meet.addEventListener("click", function () {
        self.close();
        window.dispatchEvent(new CustomEvent("portfolio:open-meeting-request"));
      });
      var more = el("button", "pcw-cta-btn", { type: "button", text: "Contact options" });
      more.addEventListener("click", function () {
        self.close();
        window.location.hash = "#contact";
      });
      row.appendChild(meet);
      row.appendChild(more);
      cta.appendChild(row);
      wrap.appendChild(cta);
      self._scrollToBottom();
    }

    var feedbackUrl = buildFeedbackUrl(this.config.apiUrl);
    if (feedbackUrl) {
      var bar = el("div", "pcw-feedback");
      var label = el("span", "pcw-feedback-label", { text: "Was this helpful?" });
      var up = el("button", "pcw-feedback-btn", { type: "button", "aria-label": "This answer was helpful", text: "\uD83D\uDC4D" });
      var down = el("button", "pcw-feedback-btn", { type: "button", "aria-label": "This answer was not helpful", text: "\uD83D\uDC4E" });
      var send = function (rating) {
        up.disabled = true;
        down.disabled = true;
        label.textContent = "Thanks for the feedback!";
        try {
          fetch(feedbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: question, answer: answer, rating: rating, matched: hasSources }),
          }).catch(function () {});
        } catch (e) {}
        if (rating === "down") showCta();
      };
      up.addEventListener("click", function () { send("up"); });
      down.addEventListener("click", function () { send("down"); });
      bar.appendChild(label);
      bar.appendChild(up);
      bar.appendChild(down);
      wrap.appendChild(bar);
    }

    if (!hasSources || UNKNOWN_RE.test(answer)) showCta();
    if (wrap.childNodes.length) {
      this.messagesEl.appendChild(wrap);
      this._scrollToBottom();
    }
  };

  // Fires when the backend's tool-calling pass detects the visitor wants to connect -- opens
  // the site's own "Request a meeting" modal pre-filled with whatever it drafted, same
  // custom-event pattern the nav uses for the command palette/terminal. The visitor still
  // reviews and sends it themselves; nothing here submits on their behalf. No extra chat
  // message here -- the backend's own "answer" text (already shown) is the confirmation.
  ChatbotWidget.prototype._handleMeetingPrefill = function (prefill) {
    if (!prefill) return;
    window.dispatchEvent(new CustomEvent("portfolio:open-meeting-request", { detail: prefill }));
  };

  var PROGRESS_LABELS = {
    checking_request: "Checking your request",
    searching_knowledge: "Searching portfolio knowledge",
    preparing_answer: "Preparing an answer",
    writing_response: "Writing the response",
    loading_saved_answer: "Loading a saved answer",
    opening_meeting: "Opening the meeting form",
  };

  ChatbotWidget.prototype._showProgress = function () {
    var card = el("details", "pcw-progress");
    var summary = el("summary", "pcw-progress-summary");
    summary.appendChild(el("span", "pcw-progress-pulse", { "aria-hidden": "true" }));
    this.progressLabel = el("span", "pcw-progress-label", { text: "Connecting to the assistant…", "aria-live": "polite" });
    summary.appendChild(this.progressLabel);
    card.appendChild(summary);
    this.progressList = el("ol", "pcw-progress-list");
    card.appendChild(this.progressList);
    card.open = true;
    this.messagesEl.appendChild(card);
    this.progressEl = card;
    this.progressActiveStep = null;
    this._scrollToBottom();
  };

  ChatbotWidget.prototype._updateProgress = function (stage) {
    var label = PROGRESS_LABELS[stage];
    if (!label || !this.progressEl) return;
    this._hideTyping();
    if (this.progressActiveStep) this.progressActiveStep.classList.remove("pcw-progress-step--active");
    var step = el("li", "pcw-progress-step pcw-progress-step--active", { text: label });
    this.progressList.appendChild(step);
    this.progressActiveStep = step;
    this.progressLabel.textContent = label + "…";
    this._scrollToBottom();
  };

  ChatbotWidget.prototype._finishProgress = function () {
    if (!this.progressEl) return;
    if (!this.progressList.childNodes.length) {
      this._removeProgress();
      return;
    }
    if (this.progressActiveStep) this.progressActiveStep.classList.remove("pcw-progress-step--active");
    this.progressEl.classList.add("pcw-progress--complete");
    this.progressLabel.textContent = "How this answer was prepared";
    this.progressEl.open = false;
    this.progressEl = null;
  };

  ChatbotWidget.prototype._removeProgress = function () {
    if (this.progressEl && this.progressEl.parentNode) this.progressEl.parentNode.removeChild(this.progressEl);
    this.progressEl = null;
    this.progressList = null;
    this.progressLabel = null;
    this.progressActiveStep = null;
  };

  ChatbotWidget.prototype._showTyping = function () {
    if (this.typingEl) return;
    this.typingEl = el("div", "pcw-typing", { "aria-label": "Assistant is typing" });
    this.typingEl.appendChild(el("span"));
    this.typingEl.appendChild(el("span"));
    this.typingEl.appendChild(el("span"));
    this.messagesEl.appendChild(this.typingEl);
    this._scrollToBottom();
  };

  ChatbotWidget.prototype._hideTyping = function () {
    if (this.typingEl && this.typingEl.parentNode) {
      this.typingEl.parentNode.removeChild(this.typingEl);
    }
    this.typingEl = null;
  };

  ChatbotWidget.prototype._scrollToBottom = function () {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  };

  ChatbotWidget.prototype._setStatus = function (status) {
    if (this.status === status) return;
    var wasOnline = this.status === "online";
    this.status = status;
    if (status === "online" && !wasOnline) this._shownWakingNotice = false;

    var label =
      status === "online"
        ? "Online"
        : status === "offline"
        ? "Offline right now — try again shortly"
        : "Waking up… (can take up to a minute)";

    [this.launcherDot, this.headerDot].forEach(
      function (dot) {
        if (!dot) return;
        dot.className = "pcw-status-dot pcw-status-dot--" + status;
        dot.setAttribute("aria-label", label);
        dot.setAttribute("title", label);
      }
    );
    if (this.headerSubtitleText) {
      this.headerSubtitleText.textContent = status === "online" ? this._defaultSubtitle : label;
    }
  };

  ChatbotWidget.prototype._scheduleHealthCheck = function (delay) {
    var self = this;
    clearTimeout(this._healthTimer);
    this._healthTimer = setTimeout(function () {
      self._checkHealth();
    }, delay);
  };

  ChatbotWidget.prototype._checkHealth = function () {
    var self = this;
    var healthUrl = buildHealthUrl(this.config.apiUrl);
    if (!healthUrl) return;

    fetch(healthUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("unhealthy");
        self._setStatus("online");
        self._scheduleHealthCheck(HEALTH_KEEPALIVE_MS);
      })
      .catch(function () {
        if (self.status === "online") {
          // Was working before -- treat any failure now as going back to sleep
          // (or briefly down) rather than waiting out a fresh wake-up timeout.
          self._setStatus("offline");
          self._scheduleHealthCheck(HEALTH_OFFLINE_RETRY_MS);
          return;
        }
        var elapsed = Date.now() - self._monitorStartedAt;
        if (elapsed > HEALTH_WAKE_TIMEOUT_MS) {
          self._setStatus("offline");
          self._scheduleHealthCheck(HEALTH_OFFLINE_RETRY_MS);
        } else {
          self._setStatus("waking");
          self._scheduleHealthCheck(HEALTH_WAKE_RETRY_MS);
        }
      });
  };

  // Pings the backend as soon as the widget loads (so a sleeping Render instance starts
  // waking up before the visitor even opens the chat panel), tracks online/waking/offline
  // state on the status dots, and re-checks promptly whenever the tab becomes visible
  // again (it may have gone back to sleep while the visitor was on another tab).
  ChatbotWidget.prototype._startHealthMonitor = function () {
    var self = this;
    this._monitorStartedAt = Date.now();
    this._checkHealth();

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      if (self.status !== "online") self._monitorStartedAt = Date.now();
      self._checkHealth();
    });
  };

  // Reads a newline-delimited-JSON stream from /api/chat/stream. Resolves once the
  // stream is done with something on screen (a full answer, or a partial one with an
  // explanatory note appended); only REJECTS when nothing was ever shown at all, which
  // is the signal _send() uses to fall back to the plain, non-streaming endpoint.
  ChatbotWidget.prototype._sendStreaming = function (question) {
    var self = this;
    var streamUrl = buildStreamUrl(this.config.apiUrl);
    if (!streamUrl) return Promise.reject(new Error("Could not build a streaming URL"));

    return fetch(streamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    }).then(function (res) {
      if (!res.ok || !res.body || !res.body.getReader) {
        throw new Error("Streaming not available (" + (res && res.status) + ")");
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var bubble = null;
      var text = "";
      var gotAnyChunk = false;
      var gotDone = false;

      function handleLine(line) {
        if (!line) return;
        var msg;
        try {
          msg = JSON.parse(line);
        } catch (e) {
          return; // ignore a malformed line rather than fail the whole stream over it
        }

        if (msg.type === "status") {
          self._updateProgress(msg.stage);
        } else if (msg.type === "chunk") {
          gotAnyChunk = true;
          if (self.progressEl) {
            if (!self.progressList.childNodes.length) self._removeProgress();
            else self.progressEl.open = false;
          }
          if (!bubble) {
            self._hideTyping();
            bubble = self._addMessage("bot", "");
          }
          text += msg.text;
          bubble.textContent = text;
          self._scrollToBottom();
        } else if (msg.type === "done") {
          gotDone = true;
          self._finishProgress();
          if (!bubble) {
            self._hideTyping();
            bubble = self._addMessage("bot", "");
          }
          // Snap to the server's canonical, fully markdown-cleaned answer, even if the
          // raw streamed chunks briefly differed from it.
          renderRich(bubble, msg.answer || text || "Sorry, I couldn't find an answer to that.");
          self._addSources(msg.sources, msg);
          self._addFollowUps(question, msg);
          self._handleMeetingPrefill(msg.meeting_prefill);
        } else if (msg.type === "error") {
          gotDone = true;
          self._removeProgress();
          if (!bubble) self._hideTyping();
          self._addMessage("error", msg.message || "Something went wrong reaching the assistant. Please try again in a moment.");
        }
      }

      function finishedIncomplete() {
        self._removeProgress();
        self._addMessage("error", "Connection interrupted — the answer above may be incomplete. Try asking again.");
      }

      function pump() {
        return reader.read().then(
          function (result) {
            if (result.done) {
              if (buffer.trim()) handleLine(buffer.trim());
              if (!gotDone) {
                if (gotAnyChunk) {
                  finishedIncomplete();
                  return;
                }
                throw new Error("Stream ended with no data");
              }
              return;
            }
            buffer += decoder.decode(result.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop(); // last, possibly-incomplete line stays buffered
            lines.forEach(handleLine);
            return pump();
          },
          function (readErr) {
            if (gotAnyChunk) {
              finishedIncomplete();
              return;
            }
            throw readErr;
          }
        );
      }

      return pump();
    });
  };

  // The original, reliable request/response call -- used as a fallback whenever
  // streaming can't even get started (old browser, network hiccup, backend not yet
  // redeployed with the /stream route, etc.).
  ChatbotWidget.prototype._sendNonStreaming = function (question) {
    var self = this;
    this._removeProgress();
    this._showTyping();
    return fetch(this.config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        self._hideTyping();
        self._addMessage("bot", data.answer || "Sorry, I couldn't find an answer to that.");
        self._addSources(data.sources, data);
        self._addFollowUps(question, data);
        self._handleMeetingPrefill(data.meeting_prefill);
      });
  };

  ChatbotWidget.prototype._send = function () {
    var self = this;
    var question = this.inputEl.value.trim();
    if (!question || this.isLoading) return;

    this._removeSuggestions();
    this._addMessage("user", question);
    this.inputEl.value = "";
    this.isLoading = true;
    this.sendBtn.disabled = true;

    if (this.status !== "online" && !this._shownWakingNotice) {
      this._shownWakingNotice = true;
      this._addMessage(
        "bot",
        this.status === "offline"
          ? "The assistant looks offline right now. I'll try anyway, but it may take a moment or fail — feel free to retry shortly."
          : "The assistant is waking up after being idle — the first reply can take up to a minute. Thanks for waiting!"
      );
    }

    this._showProgress();

    this._sendStreaming(question)
      .catch(function () {
        return self._sendNonStreaming(question);
      })
      .catch(function () {
        self._hideTyping();
        self._removeProgress();
        self._addMessage("error", "Something went wrong reaching the assistant. Please try again in a moment.");
      })
      .finally(function () {
        self.isLoading = false;
        self.sendBtn.disabled = false;
      });
  };

  function init() {
    var config = readConfig();
    if (!config.noCss) injectStylesheet();
    window.portfolioChatbot = new ChatbotWidget(config);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
