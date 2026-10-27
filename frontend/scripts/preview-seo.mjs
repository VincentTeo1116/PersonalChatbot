import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Uses an isolated headless Chrome profile; never opens the user's normal browser profile.
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.generated");
const base = process.argv[2] || "http://127.0.0.1:3100";
const browserPath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = path.join(directory, `preview-browser-${process.pid}`);
await fs.mkdir(profile, { recursive: true });
const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
let browserError;
browser.on("error", (error) => { browserError = error; });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let nextId = 0;
const pending = new Map();
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (browserError) throw browserError;
    try { port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await sleep(100); }
  }
  assert.ok(port, "Headless browser did not start.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result);
  });
  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error("Browser evaluation failed.");
    return response.result.value;
  }
  async function capture(name) {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(path.join(directory, name), Buffer.from(data, "base64"));
  }
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: base });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate("document.readyState === 'complete' && !!document.querySelector('#projects')")) break;
    await sleep(250);
  }
  await evaluate("document.fonts.ready.then(() => true)");
  await sleep(1500);
  const desktop = await evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:document.querySelector('h1')?.textContent,aboutBeforeProjects:!!(document.querySelector('#about').compareDocumentPosition(document.querySelector('#projects')) & Node.DOCUMENT_POSITION_FOLLOWING)})");
  assert.ok(desktop.h1, "Homepage H1 missing");
  assert.ok(desktop.aboutBeforeProjects, "About should appear before projects");
  assert.ok(desktop.scrollWidth <= desktop.width + 1, "Desktop horizontal overflow");
  await capture("desktop-home.png");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Page.navigate", { url: base });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate("document.readyState === 'complete' && !!document.querySelector('#projects')")) break;
    await sleep(250);
  }
  await sleep(800);
  const mobile = await evaluate("({width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,avatarLoaded:document.querySelector('#top img')?.naturalWidth > 0})");
  if (mobile.scrollWidth > 391) console.log(JSON.stringify(await evaluate("Array.from(document.querySelectorAll('main *')).map(el=>({tag:el.tagName,classes:String(el.className).slice(0,100),right:Math.round(el.getBoundingClientRect().right)})).filter(el=>el.right>391).slice(0,12)")));
  assert.ok(mobile.scrollWidth <= 391, "Mobile horizontal overflow beyond the 390px viewport");
  assert.ok(mobile.avatarLoaded, "Hero image did not load");
  await capture("mobile-home.png");
  await evaluate("document.querySelector('#projects').scrollIntoView({behavior:'instant'}); true");
  await sleep(900);
  await capture("mobile-projects.png");
  await send("Page.navigate", { url: new URL("/writing/supabase-rag-knowledge-sync", base).href });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate("document.readyState === 'complete' && !!document.querySelector('#shared-content')")) break;
    await sleep(250);
  }
  const article = await evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:document.querySelector('h1')?.textContent,sections:document.querySelectorAll('article section').length})");
  assert.ok(article.sections >= 4, "Article sections missing");
  assert.ok(article.scrollWidth <= article.width + 1, "Article horizontal overflow");
  await capture("mobile-writing.png");
  await send("Page.navigate", { url: base });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate("!!window.portfolioChatbot")) break;
    await sleep(250);
  }
  assert.ok(await evaluate("!!window.portfolioChatbot"), "Chat widget did not load");
  const chatEvents = [
    { type: "status", stage: "checking_request" },
    { type: "status", stage: "searching_knowledge" },
    { type: "status", stage: "preparing_answer" },
    { type: "status", stage: "writing_response" },
    { type: "chunk", text: "I built a RAG assistant." },
    { type: "done", answer: "I built a RAG assistant.", sources: [{ category: "Project", label: "RAG Portfolio", score: 0.812, url: "/projects/portfolio-chatbot", snippet: "A portfolio assistant grounded in public project content." }], cache_hit: false, latency_ms: 1420 },
  ];
  await evaluate(`(() => {
    const events = ${JSON.stringify(chatEvents)};
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      if (!String(input).endsWith('/api/chat/stream')) return originalFetch(input, options);
      return Promise.resolve(new Response(new ReadableStream({
        start(controller) {
          events.forEach((event, index) => setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + '\\n'));
            if (index === events.length - 1) controller.close();
          }, 100 + index * 300));
        }
      }), { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }));
    };
    const widget = window.portfolioChatbot;
    widget.config.apiUrl = 'https://chat-preview.invalid/api/chat';
    widget.open();
    widget.inputEl.value = 'Tell me about your RAG assistant';
    widget._send();
    return true;
  })()`);
  await sleep(550);
  const activeChat = await evaluate("({label:document.querySelector('.pcw-progress-label')?.textContent,steps:document.querySelectorAll('.pcw-progress-step').length,open:document.querySelector('.pcw-progress')?.open})");
  assert.equal(activeChat.label, "Searching portfolio knowledge…", "Live search status missing");
  assert.equal(activeChat.steps, 2, "Progress steps should reflect backend events");
  assert.equal(activeChat.open, true, "Active progress should be expanded");
  await capture("mobile-chat-progress.png");
  await sleep(1250);
  const finishedChat = await evaluate("({label:document.querySelector('.pcw-progress-label')?.textContent,steps:document.querySelectorAll('.pcw-progress-step').length,open:document.querySelector('.pcw-progress')?.open,answer:Array.from(document.querySelectorAll('.pcw-msg-bot')).at(-1)?.textContent})");
  assert.equal(finishedChat.label, "How this answer was prepared", "Completed timeline missing");
  assert.equal(finishedChat.steps, 4, "Completed timeline omitted a stage");
  assert.equal(finishedChat.open, false, "Completed timeline should collapse");
  assert.equal(finishedChat.answer, "I built a RAG assistant.");
  assert.equal(await evaluate("document.querySelectorAll('.pcw-source-pill').length"), 1, "Supporting source link missing");
  await capture("mobile-chat-answer.png");
  const reopened = await evaluate("(() => { document.querySelector('.pcw-progress-summary').click(); return document.querySelector('.pcw-progress').open && document.querySelectorAll('.pcw-progress-step').length === 4; })()");
  assert.equal(reopened, true, "Completed answer timeline should reopen on click");
  await capture("mobile-chat-steps.png");
  const inspection = await evaluate("(() => { const details=document.querySelector('.pcw-inspect'); if (!details || details.open) return null; details.querySelector('summary').click(); return {open:details.open, text:details.textContent, source:details.querySelector('.pcw-inspect-link')?.getAttribute('href')}; })()");
  assert.equal(inspection?.open, true, "Answer inspector should open on click");
  assert.match(inspection.text, /Server time: 1\.4 s/);
  assert.match(inspection.text, /Similarity 0\.812/);
  assert.equal(inspection.source, "/projects/portfolio-chatbot");
  await capture("mobile-chat-inspector.png");
  await send("Page.navigate", { url: new URL("/ai-lab", base).href });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate("document.readyState === 'complete' && !!window.portfolioChatbot && !!document.querySelector('h1')")) break;
    await sleep(250);
  }
  const lab = await evaluate("({title:document.querySelector('h1')?.textContent,stats:document.querySelector('main')?.textContent.includes('19/20'),width:document.documentElement.scrollWidth,viewport:innerWidth,buttons:document.querySelectorAll('button').length})");
  assert.match(lab.title, /Test the assistant/);
  assert.equal(lab.stats, true, "Measured retrieval result missing");
  assert.ok(lab.width <= lab.viewport + 1, "AI lab has mobile horizontal overflow");
  await sleep(700);
  await capture("mobile-ai-lab.png");
  assert.ok(await evaluate("!document.querySelector('[data-lab-question]')?.disabled"), "Lab questions did not connect to chat");
  await evaluate("document.querySelector('[data-lab-question]').click(); true");
  assert.equal(await evaluate("window.portfolioChatbot.inputEl.value"), "What awards has Vincent won?");
  await sleep(350);
  await capture("mobile-ai-lab-chat.png");
  console.log(JSON.stringify({ activeChat, finishedChat }, null, 2));
  console.log(JSON.stringify({ desktop, mobile, article, lab, screenshots: directory }, null, 2));
} finally {
  if (socket?.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: ++nextId, method: "Browser.close" })); socket.close(); }
  for (const waiter of pending.values()) clearTimeout(waiter.timer);
  browser.kill();
}
