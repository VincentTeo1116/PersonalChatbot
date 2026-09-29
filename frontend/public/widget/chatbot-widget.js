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

  function ChatbotWidget(config) {
    this.config = config;
    this.isOpen = false;
    this.isLoading = false;
    this._build();
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
    this.launcher.innerHTML = "&#128172;"; // speech balloon emoji, safe static markup
    this.launcher.addEventListener("click", function () {
      self.toggle();
    });

    this.panel = el("div", "pcw-panel", { hidden: "hidden", role: "dialog", "aria-label": "Chat" });

    var header = el("div", "pcw-header");
    var headerText = el("div");
    headerText.appendChild(el("div", "pcw-header-title", { text: "Ask " + this.config.ownerName }));
    headerText.appendChild(el("div", "pcw-header-subtitle", { text: "AI assistant · answers from my portfolio" }));
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
    this.panel.hidden = false;
    this.launcher.setAttribute("aria-expanded", "true");
    this.inputEl.focus();
  };

  ChatbotWidget.prototype.close = function () {
    this.isOpen = false;
    this.panel.hidden = true;
    this.launcher.setAttribute("aria-expanded", "false");
  };

  ChatbotWidget.prototype._addMessage = function (role, text) {
    var bubble = el("div", "pcw-msg pcw-msg-" + role, { text: text });
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

  ChatbotWidget.prototype._addSources = function (sources) {
    if (!sources || !sources.length) return;
    var wrap = el("div", "pcw-sources");
    sources.forEach(function (s) {
      wrap.appendChild(el("span", "pcw-source-pill", { text: s.category || "Source" }));
    });
    this.messagesEl.appendChild(wrap);
    this._scrollToBottom();
  };

  ChatbotWidget.prototype._showTyping = function () {
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

        if (msg.type === "chunk") {
          gotAnyChunk = true;
          if (!bubble) {
            self._hideTyping();
            bubble = self._addMessage("bot", "");
          }
          text += msg.text;
          bubble.textContent = text;
          self._scrollToBottom();
        } else if (msg.type === "done") {
          gotDone = true;
          if (!bubble) {
            self._hideTyping();
            bubble = self._addMessage("bot", "");
          }
          // Snap to the server's canonical, fully markdown-cleaned answer, even if the
          // raw streamed chunks briefly differed from it.
          bubble.textContent = msg.answer || text || "Sorry, I couldn't find an answer to that.";
          self._addSources(msg.sources);
        } else if (msg.type === "error") {
          gotDone = true;
          if (!bubble) self._hideTyping();
          self._addMessage("error", msg.message || "Something went wrong reaching the assistant. Please try again in a moment.");
        }
      }

      function finishedIncomplete() {
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
        self._addSources(data.sources);
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
    this._showTyping();

    this._sendStreaming(question)
      .catch(function () {
        return self._sendNonStreaming(question);
      })
      .catch(function () {
        self._hideTyping();
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
