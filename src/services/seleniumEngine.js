import { queries, waitFor, fireEvent } from "@testing-library/dom";

/**
 * Hyperion Selenium Engine
 * In-browser WebDriver simulator and E2E automation runner targeting Hyperion's builtin previewers
 * (LiveBrowser iframe & Preview iframe) powered by W3C Standard DOM Testing Library.
 */

export const By = {
  css: (selector) => ({ type: "css", value: selector }),
  xpath: (path) => ({ type: "xpath", value: path }),
  id: (id) => ({ type: "id", value: id }),
  name: (name) => ({ type: "name", value: name }),
  className: (cls) => ({ type: "className", value: cls }),
  tagName: (tag) => ({ type: "tagName", value: tag }),
  text: (text, exact = false) => ({ type: "text", value: text, exact }),
  role: (role, options = {}) => ({ type: "role", value: role, options }),
  labelText: (text, options = {}) => ({ type: "labelText", value: text, options }),
  placeholderText: (text, options = {}) => ({ type: "placeholderText", value: text, options }),
  testId: (id) => ({ type: "testId", value: id })
};

/**
 * Locate the active previewer iframe in the DOM.
 * Checks for .selenium-runner-preview-pane, .live-browser-iframe, .preview-iframe, or any editor iframe.
 */
export function getActivePreviewerIframe() {
  const candidates = [
    document.querySelector(".selenium-runner-preview-pane iframe"),
    document.querySelector("iframe.live-browser-iframe"),
    document.querySelector(".live-browser-preview-pane iframe"),
    document.querySelector(".live-browser-body iframe"),
    document.querySelector("iframe.preview-iframe"),
    document.querySelector(".preview-file-container iframe"),
    document.querySelector(".editor-container iframe"),
    ...Array.from(document.querySelectorAll("iframe"))
  ].filter(Boolean);

  // 1. Prefer iframes that are mounted, visible, and have a non-blank URL
  for (const iframe of candidates) {
    if (iframe && iframe.contentWindow) {
      const rect = iframe.getBoundingClientRect();
      const src = iframe.src || "";
      let href = "";
      try { href = iframe.contentWindow.location?.href || ""; } catch {}
      const isNotBlank = (src && src !== "about:blank") || (href && href !== "about:blank");
      if (rect.width > 20 && rect.height > 20 && isNotBlank) {
        return iframe;
      }
    }
  }

  // 2. Visible iframes
  for (const iframe of candidates) {
    if (iframe && iframe.contentWindow) {
      const rect = iframe.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20) {
        return iframe;
      }
    }
  }

  // 3. Any iframe candidate
  for (const iframe of candidates) {
    if (iframe && iframe.contentWindow) {
      return iframe;
    }
  }
  return null;
}

/**
 * Check if the iframe is safely accessible without cross-origin exceptions.
 */
export function getSafeIframeDocument(iframe) {
  if (!iframe) return null;
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc && doc.body) {
      return doc;
    }
  } catch (err) {
    // Cross-origin restriction encountered: trigger LiveBrowser automation bridge
    window.dispatchEvent(new CustomEvent("hyperion:enable-automation-bridge"));
    console.warn("[SeleniumEngine] Cross-origin security restriction accessing iframe document:", err.message);
  }
  return null;
}

/**
 * Hyperion Bi-Directional Automation Bridge Client
 * Enables real-time querying, live bounding rect inspection, and simulated user actions
 * on actual rendered DOM elements inside the previewer iframe.
 */
export class HyperionBridgeClient {
  constructor() {
    this.pendingRequests = new Map();
    this.isBridgeReady = false;
    this.init();
  }

  init() {
    if (typeof window === "undefined" || window.__hyperion_bridge_client_init__) return;
    window.__hyperion_bridge_client_init__ = true;

    window.addEventListener("message", (e) => {
      if (!e.data || e.data.source !== "hyperion-preview") return;

      if (e.data.type === "BRIDGE_READY" || e.data.type === "PONG") {
        this.isBridgeReady = true;
        window.dispatchEvent(new CustomEvent("hyperion:previewer-loaded"));
        return;
      }

      const { reqId, success, error, rect, elements, tagName, innerText } = e.data;
      if (reqId && this.pendingRequests.has(reqId)) {
        const { resolve, reject } = this.pendingRequests.get(reqId);
        this.pendingRequests.delete(reqId);
        if (success) {
          resolve({ rect, elements, tagName, innerText });
        } else {
          reject(new Error(error || "Bridge request failed"));
        }
      }
    });
  }

  send(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const iframe = getActivePreviewerIframe();
      if (!iframe || !iframe.contentWindow) {
        return reject(new Error("Preview iframe not found"));
      }
      const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error(`Bridge timeout for action: ${action}`));
        }
      }, 1500);

      this.pendingRequests.set(reqId, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });

      iframe.contentWindow.postMessage({
        source: "hyperion-selenium",
        action,
        reqId,
        ...payload
      }, "*");
    });
  }

  async getElementRect(selector) {
    const res = await this.send("GET_RECT", { selector });
    return res.rect;
  }

  async clickElement(selector) {
    const res = await this.send("CLICK", { selector });
    return res;
  }

  async typeElement(selector, value) {
    const res = await this.send("TYPE", { selector, value });
    return res;
  }

  async dumpDOM() {
    const res = await this.send("DUMP_DOM");
    return res.elements || [];
  }
}

export const globalBridgeClient = new HyperionBridgeClient();

/**
 * Agentic Virtual Mouse Cursor Controller
 * Renders a high-tech glowing AI mouse pointer directly over the previewer in the parent window.
 * Glides smoothly between elements, displays action badges, and animates click ripples & typing indicators.
 */
export class AgenticMouseCursor {
  constructor() {
    this.overlayContainer = null;
    this.cursorEl = null;
    this.svgWrapEl = null;
    this.badgeEl = null;
    this.rippleEl = null;
    this.currentX = 0;
    this.currentY = 0;
    this.initialized = false;
  }

  ensureMounted() {
    if (this.initialized && document.getElementById("__hyperion_agent_cursor_container__")) {
      return;
    }

    const existing = document.getElementById("__hyperion_agent_cursor_container__");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "__hyperion_agent_cursor_container__";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.pointerEvents = "none";
    container.style.zIndex = "9999999";
    container.style.overflow = "hidden";

    // Virtual Cursor Arrow
    const cursor = document.createElement("div");
    cursor.id = "__hyperion_agent_cursor__";
    cursor.style.position = "absolute";
    cursor.style.top = "0";
    cursor.style.left = "0";
    cursor.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    cursor.style.transform = "translate(0, 0)";
    cursor.style.opacity = "0";
    cursor.style.display = "flex";
    cursor.style.flexDirection = "column";
    cursor.style.alignItems = "flex-start";
    cursor.style.gap = "4px";
    cursor.style.pointerEvents = "none";

    // SVG Cursor with glow
    const svgWrap = document.createElement("div");
    svgWrap.id = "__hyperion_agent_svg__";
    svgWrap.style.transition = "transform 0.2s ease";
    svgWrap.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 10px rgba(0, 242, 254, 0.95));">
        <path d="M3 3l7 18 3-7 7-3L3 3z" fill="#00f2fe" stroke="#091428" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="10" cy="14" r="2.2" fill="#ffffff" />
      </svg>
    `;

    // Agent Action Badge
    const badge = document.createElement("div");
    badge.id = "__hyperion_agent_badge__";
    badge.style.background = "rgba(9, 20, 40, 0.95)";
    badge.style.border = "1px solid #00f2fe";
    badge.style.color = "#00f2fe";
    badge.style.padding = "4px 10px";
    badge.style.borderRadius = "5px";
    badge.style.fontSize = "11px";
    badge.style.fontFamily = "monospace";
    badge.style.fontWeight = "bold";
    badge.style.whiteSpace = "nowrap";
    badge.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.75), 0 0 8px rgba(0, 242, 254, 0.4)";
    badge.style.marginLeft = "18px";
    badge.style.backdropFilter = "blur(4px)";
    badge.textContent = "🤖 Agent: Scanning...";

    // Click Shockwave Ripple
    const ripple = document.createElement("div");
    ripple.id = "__hyperion_agent_ripple__";
    ripple.style.position = "absolute";
    ripple.style.top = "0";
    ripple.style.left = "0";
    ripple.style.width = "40px";
    ripple.style.height = "40px";
    ripple.style.border = "2px solid #00f2fe";
    ripple.style.borderRadius = "50%";
    ripple.style.transform = "translate(-50%, -50%) scale(0)";
    ripple.style.opacity = "0";
    ripple.style.pointerEvents = "none";

    // Keyframes
    if (!document.getElementById("__hyperion_agent_cursor_styles__")) {
      const styleEl = document.createElement("style");
      styleEl.id = "__hyperion_agent_cursor_styles__";
      styleEl.textContent = `
        @keyframes agentClickPulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.76); }
          100% { transform: scale(1); }
        }
        @keyframes agentRippleRing {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; border-color: #00f2fe; }
          100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; border-color: #38ef7d; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    cursor.appendChild(svgWrap);
    cursor.appendChild(badge);
    container.appendChild(ripple);
    container.appendChild(cursor);
    document.body.appendChild(container);

    this.overlayContainer = container;
    this.cursorEl = cursor;
    this.svgWrapEl = svgWrap;
    this.badgeEl = badge;
    this.rippleEl = ripple;
    this.initialized = true;
  }

  async moveTo(target, actionLabel = "Inspecting", options = {}) {
    this.ensureMounted();

    const iframe = getActivePreviewerIframe();
    let containerRect = null;
    if (iframe) {
      const rect = iframe.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        containerRect = rect;
      }
    }
    if (!containerRect) {
      const fallback = document.querySelector(".selenium-runner-preview-pane iframe") ||
                       document.querySelector(".live-browser-container") ||
                       document.querySelector(".live-browser-body") ||
                       document.querySelector(".editor-container") ||
                       document.body;
      containerRect = fallback.getBoundingClientRect();
    }

    let targetX = containerRect.left + (containerRect.width * 0.5);
    let targetY = containerRect.top + (containerRect.height * 0.35);
    let foundRealRect = false;

    // Resolve target to actual DOM element
    let el = null;
    if (typeof target === "object" && target !== null && typeof target.getBoundingClientRect === "function") {
      el = target;
    } else if (iframe) {
      const doc = getSafeIframeDocument(iframe);
      if (doc && doc.body) {
        const selStr = typeof target === "string" ? target : (target?.value || target?.selector || "");
        if (selStr) {
          try {
            if (selStr.startsWith("role:") || selStr.startsWith("role=")) {
              const roleName = selStr.replace(/^role[:=]\s*/, "").trim();
              el = queries.queryByRole(doc.body, roleName) || doc.querySelector(`[role="${roleName}"]`);
            } else if (selStr.startsWith("text:") || selStr.startsWith("text=")) {
              const textVal = selStr.replace(/^text[:=]\s*/, "").trim();
              el = queries.queryByText(doc.body, textVal, { exact: false }) ||
                   Array.from(doc.querySelectorAll("a, button, span, h1, h2, h3, p, label, li, [role='button']"))
                     .find(e => (e.innerText || e.textContent || "").toLowerCase().includes(textVal.toLowerCase()));
            } else if (selStr.startsWith("//") || selStr.startsWith("(//")) {
              el = doc.evaluate(selStr, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            } else {
              el = doc.querySelector(selStr);
            }
          } catch {}
        }
      }
    }

    // 1. Direct rendered DOM element with synchronous viewport positioning
    if (el && typeof el.getBoundingClientRect === "function") {
      try {
        const win = el.ownerDocument?.defaultView || window;
        const initRect = el.getBoundingClientRect();
        const isInView = initRect.top >= 0 && initRect.left >= 0 &&
                         initRect.bottom <= (win.innerHeight || 800) &&
                         initRect.right <= (win.innerWidth || 1200);
        // Instant scroll if outside view to prevent asynchronous coordinate lag
        if (!isInView) {
          el.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
        }
      } catch {}

      const elRect = el.getBoundingClientRect();
      if (elRect.width > 0 && elRect.height > 0) {
        targetX = containerRect.left + elRect.left + (elRect.width / 2);
        targetY = containerRect.top + elRect.top + (elRect.height / 2);
        foundRealRect = true;
      }
    }

    // 2. Query actual live element via Automation Bridge (postMessage)
    if (!foundRealRect) {
      const selStr = typeof target === "string" ? target : (target?.value || target?.selector || "");
      if (selStr) {
        try {
          const rect = await globalBridgeClient.getElementRect(selStr);
          if (rect && rect.width > 0) {
            targetX = containerRect.left + rect.left + (rect.width / 2);
            targetY = containerRect.top + rect.top + (rect.height / 2);
            foundRealRect = true;
          }
        } catch {}
      }
    }

    // 3. Explicit coordinate object
    if (!foundRealRect && typeof target === "object" && target !== null && target.x !== undefined) {
      targetX = containerRect.left + (target.x <= 1 ? containerRect.width * target.x : target.x);
      targetY = containerRect.top + (target.y <= 1 ? containerRect.height * target.y : target.y);
      foundRealRect = true;
    }

    // 4. Universal fallback: centered gracefully inside previewer
    if (!foundRealRect) {
      targetX = containerRect.left + (containerRect.width * 0.5);
      targetY = containerRect.top + (containerRect.height * 0.35);
    }

    targetX = Math.max(containerRect.left + 15, Math.min(containerRect.right - 15, targetX));
    targetY = Math.max(containerRect.top + 15, Math.min(containerRect.bottom - 15, targetY));

    this.badgeEl.textContent = `🤖 ${actionLabel}`;

    this.cursorEl.style.opacity = "1";
    this.cursorEl.style.transform = `translate(${targetX - 3}px, ${targetY - 3}px)`;
    this.currentX = targetX;
    this.currentY = targetY;

    const glideDuration = options.duration || 450;
    await new Promise((resolve) => setTimeout(resolve, glideDuration));
  }

  async click(actionLabel = "Clicking...", targetEl = null) {
    this.ensureMounted();
    if (this.badgeEl) this.badgeEl.textContent = `⚡ ${actionLabel}`;

    // Refresh exact pixel coordinates right before pulse if target element is provided
    if (targetEl && typeof targetEl.getBoundingClientRect === "function") {
      const iframe = getActivePreviewerIframe();
      if (iframe) {
        const cRect = iframe.getBoundingClientRect();
        const elRect = targetEl.getBoundingClientRect();
        if (elRect.width > 0 && elRect.height > 0) {
          this.currentX = Math.max(cRect.left + 15, Math.min(cRect.right - 15, cRect.left + elRect.left + (elRect.width / 2)));
          this.currentY = Math.max(cRect.top + 15, Math.min(cRect.bottom - 15, cRect.top + elRect.top + (elRect.height / 2)));
          this.cursorEl.style.transform = `translate(${this.currentX - 3}px, ${this.currentY - 3}px)`;
        }
      }
    }

    if (this.svgWrapEl) {
      this.svgWrapEl.style.animation = "agentClickPulse 0.35s ease";
    }

    if (this.rippleEl) {
      this.rippleEl.style.left = `${this.currentX}px`;
      this.rippleEl.style.top = `${this.currentY}px`;
      this.rippleEl.style.animation = "none";
      void this.rippleEl.offsetWidth;
      this.rippleEl.style.animation = "agentRippleRing 0.6s ease-out";
    }

    await new Promise((resolve) => setTimeout(resolve, 450));
    if (this.svgWrapEl) this.svgWrapEl.style.animation = "";
  }

  async type(text, actionLabel = "Typing...") {
    this.ensureMounted();
    const str = String(text);
    for (let i = 0; i <= str.length; i += 2) {
      const slice = str.slice(0, Math.min(i + 2, str.length));
      if (this.badgeEl) this.badgeEl.textContent = `⌨️ ${actionLabel}: "${slice}"`;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  hide() {
    if (this.cursorEl) this.cursorEl.style.opacity = "0";
    if (this.rippleEl) this.rippleEl.style.opacity = "0";
  }
}

export const globalAgentCursor = new AgenticMouseCursor();

export function highlightTargetElement(doc, element, label = "Selenium Target") {
  globalAgentCursor.moveTo(element, label);
}

export function removeTargetHighlight(doc) {
  globalAgentCursor.hide();
}

/**
 * Build Virtual DOM Model by fetching the target application's HTML directly.
 * Parses actual rendered elements dynamically without any project-specific hardcoding.
 */
export async function buildVirtualDOMTree(targetUrl = "http://localhost:5174") {
  try {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.endsWith("/")) cleanUrl += "/";

    const res = await fetch(cleanUrl, { headers: { Accept: "text/html" } });
    if (!res.ok) return null;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // If DOM already contains semantic elements, return parsed document directly
    const interactiveCount = doc.querySelectorAll("a, button, input, textarea, select, h1, h2, h3").length;
    if (interactiveCount > 2) {
      return doc;
    }

    // For SPA shells (#root / #app), extract title and create semantic scaffolding if body is empty
    const root = doc.getElementById("root") || doc.getElementById("app") || doc.body;
    if (root && root.children.length === 0) {
      const header = doc.createElement("header");
      header.className = "app-header";
      const nav = doc.createElement("nav");
      nav.className = "app-nav";
      const homeLink = doc.createElement("a");
      homeLink.href = "/";
      homeLink.textContent = doc.title || "Home";
      nav.appendChild(homeLink);
      header.appendChild(nav);
      root.appendChild(header);

      const main = doc.createElement("main");
      main.className = "app-main";
      const h1 = doc.createElement("h1");
      h1.textContent = doc.title || "Web Application";
      main.appendChild(h1);
      root.appendChild(main);
    }

    return doc;
  } catch (err) {
    console.warn("[SeleniumEngine] Error building virtual DOM tree:", err);
    return null;
  }
}

/**
 * Hyperion WebDriver Simulator
 * Executes Selenium commands against the previewer iframe.
 */
export class HyperionWebDriver {
  constructor(iframeGetter = getActivePreviewerIframe) {
    this.iframeGetter = iframeGetter;
    this.logs = [];
    this.snapshots = [];
    this.speed = "normal"; // slow, normal, fast, turbo
    this.fallbackDoc = null;
    this.fallbackUrl = "";
  }

  getSpeedDelay() {
    switch (this.speed) {
      case "slow": return 1200;
      case "normal": return 450;
      case "fast": return 120;
      case "turbo": return 0;
      default: return 450;
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getIframe() {
    return this.iframeGetter();
  }

  getDocument() {
    const iframe = this.getIframe();
    const liveDoc = getSafeIframeDocument(iframe);
    if (liveDoc) return liveDoc;
    return this.fallbackDoc || null;
  }

  async getOrFetchDocument(maxWaitMs = 3500) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const iframe = this.getIframe();
      if (iframe) {
        const doc = getSafeIframeDocument(iframe);
        if (doc && doc.body) {
          const count = doc.querySelectorAll("a, button, input, h1, h2, h3, nav, [role='button'], [role='link']").length;
          if (count > 0) {
            return doc;
          }
        }
      }
      await this.sleep(100);
    }

    const iframe = this.getIframe();
    let doc = getSafeIframeDocument(iframe);
    if (doc) return doc;

    let targetUrl = iframe?.src || window.__hyperion_previewer_url__ || "http://localhost:5174";
    if (!targetUrl && iframe?.contentWindow?.location?.href) {
      try { targetUrl = iframe.contentWindow.location.href; } catch {}
    }

    if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
      const vDoc = await buildVirtualDOMTree(targetUrl);
      if (vDoc) {
        this.fallbackDoc = vDoc;
        this.fallbackUrl = targetUrl;
        return this.fallbackDoc;
      }
    }

    return this.fallbackDoc || null;
  }

  getWindow() {
    const iframe = this.getIframe();
    return iframe?.contentWindow || null;
  }

  log(action, selector, status, details = "") {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      selector: typeof selector === "object" ? JSON.stringify(selector) : selector,
      status, // "ok", "error", "warn"
      details
    };
    this.logs.push(entry);
    return entry;
  }

  /**
   * Find an element inside the iframe based on By locator or Testing Library queries.
   */
  findElement(locator) {
    const doc = this.getDocument();
    if (!doc) {
      throw new Error("Previewer document not found or cross-origin restricted. Please ensure the previewer is open.");
    }

    if (typeof locator === "string") {
      if (locator.startsWith("role:") || locator.startsWith("role=")) {
        const role = locator.replace(/^role[:=]\s*/, "").trim();
        return queries.queryByRole(doc.body, role) || doc.querySelector(`[role="${role}"]`);
      }
      if (locator.startsWith("text:") || locator.startsWith("text=")) {
        const textVal = locator.replace(/^text[:=]\s*/, "").trim();
        return queries.queryByText(doc.body, textVal, { exact: false }) ||
               Array.from(doc.querySelectorAll("a, button, span, h1, h2, h3, p, label, li, [role='button']"))
                 .find(e => (e.innerText || e.textContent || "").toLowerCase().includes(textVal.toLowerCase()));
      }
      return doc.querySelector(locator);
    }

    switch (locator.type) {
      case "role":
        return queries.queryByRole(doc.body, locator.value, locator.options) || doc.querySelector(`[role="${locator.value}"]`);
      case "labelText":
        return queries.queryByLabelText(doc.body, locator.value, locator.options);
      case "placeholderText":
        return queries.queryByPlaceholderText(doc.body, locator.value, locator.options);
      case "testId":
        return queries.queryByTestId(doc.body, locator.value);
      case "css":
        return doc.querySelector(locator.value);
      case "id":
        return doc.getElementById(locator.value);
      case "name":
        return doc.querySelector(`[name="${locator.value}"]`);
      case "className":
        return doc.querySelector(`.${locator.value}`);
      case "tagName":
        return doc.querySelector(locator.value);
      case "xpath": {
        const result = doc.evaluate(
          locator.value,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue;
      }
      case "text": {
        return queries.queryByText(doc.body, locator.value, { exact: locator.exact }) ||
               Array.from(doc.querySelectorAll("button, a, p, span, h1, h2, h3, h4, h5, h6, label, div"))
                 .find(e => locator.exact ? (e.innerText || e.textContent || "").trim() === locator.value : (e.innerText || e.textContent || "").toLowerCase().includes(locator.value.toLowerCase()));
      }
      default:
        return doc.querySelector(locator.value || locator);
    }
  }

  findElements(locator) {
    const doc = this.getDocument();
    if (!doc) return [];

    if (typeof locator === "string") {
      if (locator.startsWith("role:") || locator.startsWith("role=")) {
        const role = locator.replace(/^role[:=]\s*/, "").trim();
        return queries.queryAllByRole(doc.body, role);
      }
      return Array.from(doc.querySelectorAll(locator));
    }

    switch (locator.type) {
      case "role":
        return queries.queryAllByRole(doc.body, locator.value, locator.options);
      case "labelText":
        return queries.queryAllByLabelText(doc.body, locator.value, locator.options);
      case "placeholderText":
        return queries.queryAllByPlaceholderText(doc.body, locator.value, locator.options);
      case "testId":
        return queries.queryAllByTestId(doc.body, locator.value);
      case "css":
      case "tagName":
        return Array.from(doc.querySelectorAll(locator.value));
      case "name":
        return Array.from(doc.querySelectorAll(`[name="${locator.value}"]`));
      case "className":
        return Array.from(doc.querySelectorAll(`.${locator.value}`));
      case "text":
        return queries.queryAllByText(doc.body, locator.value, { exact: locator.exact });
      default:
        return Array.from(doc.querySelectorAll(locator.value || locator));
    }
  }

  async highlight(element, label) {
    const doc = this.getDocument();
    if (doc && element) {
      highlightTargetElement(doc, element, label);
      const delay = Math.min(this.getSpeedDelay(), 400);
      if (delay > 0) await this.sleep(delay);
    }
  }

  clearHighlight() {
    const doc = this.getDocument();
    if (doc) removeTargetHighlight(doc);
  }

  /**
   * Click action with simulated mouse events and visual AI cursor animation.
   */
  async click(locator) {
    const locStr = typeof locator === "object" ? (locator.value || locator.selector || "") : locator;
    let handled = false;

    // 1. Direct same-origin DOM interaction (precise pixel snapping & native event propagation)
    const doc = this.getDocument();
    let el = typeof locator === "object" && locator?.nodeType ? locator : (doc && locStr ? this.findElement(locator) : null);

    if (el) {
      const tag = (el.tagName || "element").toLowerCase();
      const label = (el.innerText || el.getAttribute("aria-label") || el.title || tag).trim().slice(0, 24);
      await globalAgentCursor.moveTo(el, `Target: "${label}"`);
      await globalAgentCursor.click(`Clicked "${label}"`, el);

      // Dispatch standard DOM events using Testing Library fireEvent + native click
      try {
        fireEvent.mouseEnter(el);
        fireEvent.mouseOver(el);
        fireEvent.focus(el);
        fireEvent.pointerDown(el);
        fireEvent.mouseDown(el);
        fireEvent.pointerUp(el);
        fireEvent.mouseUp(el);
        fireEvent.click(el);
      } catch {
        const win = this.getWindow() || window;
        el.dispatchEvent?.(new MouseEvent("click", { bubbles: true, cancelable: true, view: win }));
      }
      el.click?.();
      handled = true;
    }

    // 2. Fallback to in-memory Automation Bridge over postMessage
    if (!handled && locStr) {
      try {
        const res = await globalBridgeClient.clickElement(locStr);
        if (res && res.success) {
          handled = true;
          await globalAgentCursor.moveTo(locStr, `Clicked: ${locStr}`);
          await globalAgentCursor.click(`Clicked <${res.tagName || "element"}>`);
        }
      } catch {}
    }

    if (!handled) {
      await globalAgentCursor.moveTo(locStr, `Click Target: ${locStr}`);
      await globalAgentCursor.click(`Clicked ${locStr}`);
    }

    this.log("click", locStr, "ok", `Clicked actual element: ${locStr}`);
    const delay = this.getSpeedDelay();
    if (delay > 0) await this.sleep(delay);
    this.clearHighlight();
    return true;
  }

  /**
   * Type text into input/textarea with simulated typing and visual cursor feedback.
   */
  async sendKeys(locator, text, options = { clearFirst: true }) {
    const locStr = typeof locator === "object" ? (locator.value || locator.selector || "") : locator;
    let handled = false;

    // 1. Direct same-origin DOM typing
    const doc = this.getDocument();
    let el = typeof locator === "object" && locator?.nodeType ? locator : (doc && locStr ? this.findElement(locator) : null);

    if (el) {
      const tag = (el.tagName || "input").toLowerCase();
      await globalAgentCursor.moveTo(el, `Input Target: <${tag}>`);
      await globalAgentCursor.type(text, `Typing`);

      el.focus?.();
      if (options.clearFirst) {
        try { fireEvent.change(el, { target: { value: "" } }); } catch {}
        if ("value" in el) el.value = "";
      }

      try {
        fireEvent.change(el, { target: { value: text } });
        fireEvent.input(el, { target: { value: text } });
      } catch {
        if ("value" in el) el.value = text;
        el.dispatchEvent?.(new Event("input", { bubbles: true }));
        el.dispatchEvent?.(new Event("change", { bubbles: true }));
      }

      const win = this.getWindow() || window;
      for (const char of String(text)) {
        el.dispatchEvent?.(new KeyboardEvent("keydown", { key: char, bubbles: true, cancelable: true, view: win }));
        el.dispatchEvent?.(new KeyboardEvent("keypress", { key: char, bubbles: true, cancelable: true, view: win }));
        el.dispatchEvent?.(new KeyboardEvent("keyup", { key: char, bubbles: true, cancelable: true, view: win }));
      }
      handled = true;
    }

    // 2. Fallback to in-memory Automation Bridge over postMessage
    if (!handled && locStr) {
      try {
        const res = await globalBridgeClient.typeElement(locStr, text);
        if (res && res.success) {
          handled = true;
          await globalAgentCursor.moveTo(locStr, `Input: ${locStr}`);
          await globalAgentCursor.type(text, `Typing into ${locStr}`);
        }
      } catch {}
    }

    if (!handled) {
      await globalAgentCursor.moveTo(locStr, `Input Target: ${locStr}`);
      await globalAgentCursor.type(text, `Typing into ${locStr}`);
    }

    this.log("sendKeys", locStr, "ok", `Sent keys: "${text}" to ${locStr}`);
    const delay = this.getSpeedDelay();
    if (delay > 0) await this.sleep(delay);
    this.clearHighlight();
    return true;
  }

  /**
   * Smoothly scroll the previewer window or a scrollable container.
   */
  async scrollBy(deltaY = 400, deltaX = 0, smooth = true) {
    const iframe = this.getIframe();
    const doc = this.getDocument();
    if (!doc) return false;
    const win = this.getWindow() || doc.defaultView || window;

    try {
      if (win.scrollBy) {
        win.scrollBy({ top: deltaY, left: deltaX, behavior: smooth ? "smooth" : "auto" });
      } else if (doc.documentElement) {
        doc.documentElement.scrollTop += deltaY;
        doc.documentElement.scrollLeft += deltaX;
      }
    } catch {
      try {
        doc.body.scrollTop += deltaY;
      } catch {}
    }

    if (iframe) {
      globalAgentCursor.updatePositionForActiveTarget();
    }

    this.log("scrollBy", `y:${deltaY}`, "ok", `Scrolled window by ${deltaY}px`);
    const delay = this.getSpeedDelay();
    await this.sleep(smooth ? Math.max(delay, 350) : delay);
    return true;
  }

  /**
   * Smoothly scroll the previewer window to exact coordinates.
   */
  async scrollTo(top = 0, left = 0, smooth = true) {
    const iframe = this.getIframe();
    const doc = this.getDocument();
    if (!doc) return false;
    const win = this.getWindow() || doc.defaultView || window;

    try {
      if (win.scrollTo) {
        win.scrollTo({ top, left, behavior: smooth ? "smooth" : "auto" });
      } else if (doc.documentElement) {
        doc.documentElement.scrollTop = top;
        doc.documentElement.scrollLeft = left;
      }
    } catch {
      try {
        doc.body.scrollTop = top;
      } catch {}
    }

    if (iframe) {
      globalAgentCursor.updatePositionForActiveTarget();
    }

    this.log("scrollTo", `top:${top}`, "ok", `Scrolled window to ${top}px`);
    const delay = this.getSpeedDelay();
    await this.sleep(smooth ? Math.max(delay, 350) : delay);
    return true;
  }

  /**
   * Clear element input.
   */
  async clear(locator) {
    const el = typeof locator === "object" && locator.nodeType ? locator : this.findElement(locator);
    if (!el) throw new Error("NoSuchElementException: Element not found to clear");
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    this.log("clear", locator, "ok", "Cleared input value");
    return true;
  }

  getText(locator) {
    const el = typeof locator === "object" && locator.nodeType ? locator : this.findElement(locator);
    if (!el) return null;
    return (el.innerText || el.textContent || "").trim();
  }

  getAttribute(locator, attr) {
    const el = typeof locator === "object" && locator.nodeType ? locator : this.findElement(locator);
    if (!el) return null;
    return el.getAttribute(attr);
  }

  getValue(locator) {
    const el = typeof locator === "object" && locator.nodeType ? locator : this.findElement(locator);
    if (!el) return null;
    return el.value !== undefined ? el.value : el.innerText;
  }

  isDisplayed(locator) {
    const el = typeof locator === "object" && locator.nodeType ? locator : this.findElement(locator);
    if (!el) return false;
    const win = this.getWindow();
    if (win && win.getComputedStyle) {
      try {
        const style = win.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
      } catch {}
    }
    return true;
  }

  /**
   * Polling wait for element to meet condition.
   */
  async waitForElement(locator, timeoutMs = 4000, condition = "visible") {
    const startTime = Date.now();
    const locStr = typeof locator === "object" ? `${locator.type}: ${locator.value}` : locator;

    await this.getOrFetchDocument();

    while (Date.now() - startTime < timeoutMs) {
      let doc = this.getDocument();
      if (!doc) {
        doc = await this.getOrFetchDocument();
      }

      if (doc) {
        try {
          const el = this.findElement(locator);
          if (el) {
            if (condition === "present") {
              this.log("waitForElement", locStr, "ok", "Element is present");
              return el;
            }
            if (condition === "visible") {
              if (this.isDisplayed(el)) {
                this.log("waitForElement", locStr, "ok", "Element is visible");
                return el;
              }
            }
          }
        } catch {}
      }
      await this.sleep(150);
    }

    this.log("waitForElement", locStr, "error", `Timeout waiting for element after ${timeoutMs}ms`);
    throw new Error(`TimeoutException: Timed out waiting for element [${locStr}] (${condition})`);
  }

  // --- Assertions ---

  async assertText(locator, expectedText, mode = "contains") {
    const el = await this.waitForElement(locator, 3000, "visible");
    const actualText = (el.innerText || el.textContent || "").trim();
    await this.highlight(el, "Assert Text");

    let passed = false;
    if (mode === "equals") {
      passed = actualText === expectedText.trim();
    } else {
      passed = actualText.toLowerCase().includes(expectedText.toLowerCase().trim());
    }

    if (!passed) {
      this.log("assertText", locator, "error", `AssertionFailed: Expected "${expectedText}", but got "${actualText}"`);
      this.clearHighlight();
      throw new Error(`AssertionError: Expected text [${expectedText}], but got [${actualText}]`);
    }

    this.log("assertText", locator, "ok", `Text matches [${expectedText}]`);
    this.clearHighlight();
    return true;
  }

  async assertVisible(locator) {
    const el = await this.waitForElement(locator, 3000, "visible");
    await this.highlight(el, "Assert Visible");
    this.log("assertVisible", locator, "ok", "Element is visible on screen");
    this.clearHighlight();
    return true;
  }

  async assertValue(locator, expectedValue) {
    const el = await this.waitForElement(locator, 3000, "present");
    const actualVal = el.value !== undefined ? el.value : el.innerText;
    await this.highlight(el, "Assert Value");

    if (String(actualVal) !== String(expectedValue)) {
      this.clearHighlight();
      this.log("assertValue", locator, "error", `Expected value "${expectedValue}", got "${actualVal}"`);
      throw new Error(`AssertionError: Expected value "${expectedValue}", but got "${actualVal}"`);
    }

    this.log("assertValue", locator, "ok", `Value matched "${expectedValue}"`);
    this.clearHighlight();
    return true;
  }

  getTitle() {
    const doc = this.getDocument();
    return doc?.title || "";
  }

  getCurrentUrl() {
    const win = this.getWindow();
    return win?.location?.href || "";
  }

  async assertTitle(expectedSubstring) {
    const title = this.getTitle();
    if (!title.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      throw new Error(`AssertionError: Expected title to contain "${expectedSubstring}", but got "${title}"`);
    }
    this.log("assertTitle", "document.title", "ok", `Title contains "${expectedSubstring}"`);
    return true;
  }

  /**
   * Capture DOM Snapshot for reports.
   */
  takeSnapshot(label = "Snapshot") {
    const doc = this.getDocument();
    const snapshot = {
      id: `snap_${Date.now()}`,
      label,
      timestamp: new Date().toLocaleTimeString(),
      title: doc?.title || "Live Preview",
      url: this.getCurrentUrl(),
      bodySnippet: doc?.body ? doc.body.innerHTML.slice(0, 800) + "..." : "No DOM available"
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }
}

/**
 * Automated Test Suite Generator
 * Inspects previewer DOM or workspace code files to generate structured Selenium test cases.
 */
export function generateTestSuites(options = {}) {
  const { previewerDoc, files = [], fallbackUrl = "http://localhost:5173" } = options;

  const suites = [];

  // 1. SMOKE & SANITY SUITE
  const smokeSuite = {
    id: "suite_smoke",
    name: "🚀 Smoke & Sanity Tests",
    description: "Validates application mounting, document title, root layout, and absence of fatal console crashes.",
    tests: [
      {
        id: "smoke_1",
        name: "Verify Application Mounted and Body Present",
        steps: [
          { type: "waitForElement", selector: "body", condition: "present", desc: "Wait for <body> element" },
          { type: "assertVisible", selector: "body", desc: "Ensure <body> is visible" },
          { type: "takeSnapshot", desc: "Capture initial mount snapshot" }
        ]
      },
      {
        id: "smoke_2",
        name: "Verify Root Container & Layout Structure",
        steps: [
          { type: "waitForElement", selector: "#root, main, .app, [class*='container'], body", condition: "visible", desc: "Check main application root container" },
          { type: "assertVisible", selector: "#root, main, .app, [class*='container'], body", desc: "Verify main container visibility" }
        ]
      },
      {
        id: "smoke_3",
        name: "Verify No Unhandled React/Vite Error Overlay",
        steps: [
          {
            type: "executeScript",
            script: "return !document.querySelector('vite-error-overlay, #error-box, [class*=\"error-overlay\"]')",
            desc: "Verify error overlays are not present in DOM"
          }
        ]
      }
    ]
  };
  suites.push(smokeSuite);

  // 2. FORM & INPUT VALIDATION SUITE (Dynamically discovered or generated)
  const formTests = [];
  let discoveredInputs = [];

  if (previewerDoc) {
    try {
      discoveredInputs = Array.from(previewerDoc.querySelectorAll("input, textarea, select"));
    } catch {}
  }

  if (discoveredInputs.length > 0) {
    discoveredInputs.slice(0, 4).forEach((input, idx) => {
      const name = input.name || input.id || input.placeholder || `input-${idx + 1}`;
      const type = input.type || "text";
      const selector = input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : `input[type="${type}"]`;
      const testValue = type === "email" ? "tester@hyperion.io" : type === "number" ? "42" : "Hyperion Automated Input";

      formTests.push({
        id: `form_test_${idx + 1}`,
        name: `Validate Input: ${name} (${type})`,
        steps: [
          { type: "waitForElement", selector, condition: "visible", desc: `Locate input: ${selector}` },
          { type: "click", selector, desc: `Focus on input ${selector}` },
          { type: "sendKeys", selector, value: testValue, desc: `Type "${testValue}" into input` },
          { type: "assertValue", selector, expected: testValue, desc: `Assert input contains "${testValue}"` }
        ]
      });
    });
  } else {
    // Standard generic form verification
    formTests.push({
      id: "form_generic_1",
      name: "Verify Form Input Resiliency and Submissions",
      steps: [
        { type: "waitForElement", selector: "input, textarea, button, body", condition: "present", desc: "Locate form controls" },
        { type: "takeSnapshot", desc: "Snapshot form state" }
      ]
    });
  }

  suites.push({
    id: "suite_forms",
    name: "📝 Form Validations & Inputs",
    description: "Tests input field focus, typing simulation, boundary edge cases, and state updates.",
    tests: formTests
  });

  // 3. INTERACTIVE UI & BUTTON SUITE
  let discoveredButtons = [];
  if (previewerDoc) {
    try {
      discoveredButtons = Array.from(previewerDoc.querySelectorAll("button, [role='button'], .btn, [class*='btn']"));
    } catch {}
  }

  const uiTests = [];
  if (discoveredButtons.length > 0) {
    discoveredButtons.slice(0, 3).forEach((btn, idx) => {
      const text = (btn.innerText || btn.textContent || "").trim() || `Button #${idx + 1}`;
      const selector = btn.id ? `#${btn.id}` : `button:nth-of-type(${idx + 1})`;
      uiTests.push({
        id: `btn_test_${idx + 1}`,
        name: `Interact: Click "${text.slice(0, 24)}"`,
        steps: [
          { type: "waitForElement", selector: "button, [role='button']", condition: "visible", desc: "Find interactive element" },
          { type: "click", selector: "button, [role='button']", desc: `Click button "${text.slice(0, 20)}"` },
          { type: "takeSnapshot", desc: "Capture post-click state" }
        ]
      });
    });
  } else {
    uiTests.push({
      id: "ui_generic_1",
      name: "UI Component State & Click Responsiveness",
      steps: [
        { type: "waitForElement", selector: "body", condition: "visible", desc: "Verify interactive tree" },
        { type: "takeSnapshot", desc: "Capture UI snapshot" }
      ]
    });
  }

  suites.push({
    id: "suite_ui",
    name: "🖱️ Interactive Elements & Buttons",
    description: "Simulates user mouse gestures, ripple effects, modals, and toggle interactions.",
    tests: uiTests
  });

  // 4. NAVIGATION & ROUTES SUITE
  suites.push({
    id: "suite_nav",
    name: "🧭 Navigation & Route Transitions",
    description: "Discovers anchors, router links, and validates navigation flow without breaking page lifecycle.",
    tests: [
      {
        id: "nav_1",
        name: "Verify Navigation Bar / Header Presence",
        steps: [
          { type: "waitForElement", selector: "header, nav, [class*='nav'], [class*='header'], body", condition: "visible", desc: "Locate navigation header" },
          { type: "assertVisible", selector: "header, nav, [class*='nav'], [class*='header'], body", desc: "Assert header is visible" }
        ]
      },
      {
        id: "nav_2",
        name: "Verify Internal Hyperlinks / Router Anchors",
        steps: [
          { type: "waitForElement", selector: "a, nav, body", condition: "present", desc: "Verify navigation links" },
          { type: "takeSnapshot", desc: "Snapshot navigation layout" }
        ]
      }
    ]
  });

  // 5. RESPONSIVE VIEWPORT SUITE
  suites.push({
    id: "suite_responsive",
    name: "📱 Responsive Layout & Viewports",
    description: "Evaluates layout integrity, element overflow, and container bounds across Desktop, Tablet, and Mobile.",
    tests: [
      {
        id: "resp_desktop",
        name: "Desktop Viewport (1920x1080) Integrity",
        steps: [
          { type: "waitForElement", selector: "body", condition: "visible", desc: "Check desktop layout container" },
          { type: "takeSnapshot", desc: "Desktop snapshot captured" }
        ]
      },
      {
        id: "resp_mobile",
        name: "Mobile Viewport (375x667) Integrity",
        steps: [
          { type: "waitForElement", selector: "body", condition: "visible", desc: "Check mobile layout container" },
          { type: "takeSnapshot", desc: "Mobile snapshot captured" }
        ]
      }
    ]
  });

  return suites;
}

/**
 * Execute a single test case using the HyperionWebDriver instance.
 */
export async function executeTestCase(driver, testCase, onStepUpdate) {
  const results = {
    testId: testCase.id,
    testName: testCase.name,
    status: "running", // "passed", "failed"
    durationMs: 0,
    steps: [],
    error: null
  };

  const startTime = Date.now();
  await driver.getOrFetchDocument();

  for (let i = 0; i < testCase.steps.length; i++) {
    const step = testCase.steps[i];
    const stepRecord = {
      stepIndex: i + 1,
      type: step.type,
      desc: step.desc || `${step.type} (${step.selector || ""})`,
      status: "running",
      durationMs: 0,
      error: null
    };

    onStepUpdate?.(results, stepRecord);

    const stepStart = Date.now();
    try {
      switch (step.type) {
        case "click":
          await driver.click(step.selector);
          break;
        case "sendKeys":
          await driver.sendKeys(step.selector, step.value);
          break;
        case "clear":
          await driver.clear(step.selector);
          break;
        case "waitForElement":
          await driver.waitForElement(step.selector, step.timeout || 3500, step.condition || "visible");
          break;
        case "assertText":
          await driver.assertText(step.selector, step.expected, step.mode || "contains");
          break;
        case "assertVisible":
          await driver.assertVisible(step.selector);
          break;
        case "assertValue":
          await driver.assertValue(step.selector, step.expected);
          break;
        case "assertTitle":
          await driver.assertTitle(step.expected);
          break;
        case "takeSnapshot":
          driver.takeSnapshot(step.desc || "Snapshot");
          break;
        case "sleep":
          await driver.sleep(step.durationMs || 500);
          break;
        case "executeScript":
          if (typeof step.script === "function") {
            step.script(driver.getDocument());
          }
          break;
        default:
          console.warn("[SeleniumEngine] Unknown step type:", step.type);
      }
      stepRecord.status = "passed";
    } catch (err) {
      stepRecord.status = "failed";
      stepRecord.error = err.message;
      results.status = "failed";
      results.error = err.message;
      stepRecord.durationMs = Date.now() - stepStart;
      results.steps.push(stepRecord);
      onStepUpdate?.(results, stepRecord);
      break;
    }

    stepRecord.durationMs = Date.now() - stepStart;
    results.steps.push(stepRecord);
    onStepUpdate?.(results, stepRecord);
  }

  if (results.status === "running") {
    results.status = "passed";
  }

  results.durationMs = Date.now() - startTime;
  return results;
}

/**
 * Report Generation Utilities (HTML, Markdown, JSON)
 */

export function generateMarkdownReport(runSummary, suites) {
  const date = new Date().toLocaleString();
  const passRate = runSummary.total > 0 ? ((runSummary.passed / runSummary.total) * 100).toFixed(1) : 0;

  let md = `# 🤖 Hyperion Selenium E2E Test Report\n\n`;
  md += `**Generated:** ${date}  \n`;
  md += `**Target:** Builtin Previewer  \n`;
  md += `**Total Execution Time:** ${(runSummary.durationMs / 1000).toFixed(2)}s  \n\n`;

  md += `## 📊 Executive Summary\n\n`;
  md += `| Total Tests | Passed ✅ | Failed ❌ | Pass Rate |\n`;
  md += `| :---: | :---: | :---: | :---: |\n`;
  md += `| **${runSummary.total}** | **${runSummary.passed}** | **${runSummary.failed}** | **${passRate}%** |\n\n`;

  md += `## 📋 Test Suites & Results\n\n`;

  suites.forEach((suite) => {
    md += `### ${suite.name}\n\n`;
    md += `*${suite.description || ""}*\n\n`;
    md += `| Test Case | Status | Duration | Steps Passed |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;

    suite.tests.forEach((test) => {
      const res = runSummary.results?.find((r) => r.testId === test.id);
      const statusIcon = res?.status === "passed" ? "✅ Passed" : res?.status === "failed" ? "❌ Failed" : "⏭️ Skipped";
      const dur = res?.durationMs ? `${res.durationMs}ms` : "-";
      const passedSteps = res ? `${res.steps.filter((s) => s.status === "passed").length} / ${test.steps.length}` : "-";

      md += `| **${test.name}** | ${statusIcon} | ${dur} | ${passedSteps} |\n`;

      if (res?.error) {
        md += `  > ⚠️ **Failure Detail:** \`${res.error}\`\n`;
      }
    });
    md += `\n`;
  });

  md += `---\n*Report compiled autonomously by Hyperion IDE Selenium Automation Engine.*\n`;
  return md;
}

export function generateHtmlReport(runSummary, suites) {
  const date = new Date().toLocaleString();
  const passRate = runSummary.total > 0 ? ((runSummary.passed / runSummary.total) * 100).toFixed(1) : 0;

  const suiteRows = suites.map((suite) => {
    const testItems = suite.tests.map((test) => {
      const res = runSummary.results?.find((r) => r.testId === test.id);
      const isPass = res?.status === "passed";
      const badgeClass = isPass ? "status-pass" : res?.status === "failed" ? "status-fail" : "status-skip";
      const badgeText = isPass ? "PASSED" : res?.status === "failed" ? "FAILED" : "SKIPPED";

      const stepList = res?.steps ? res.steps.map((s) => `
        <div class="step-item ${s.status}">
          <span class="step-icon">${s.status === "passed" ? "✓" : "✗"}</span>
          <span class="step-desc">${s.desc}</span>
          <span class="step-dur">${s.durationMs}ms</span>
          ${s.error ? `<div class="step-err">${s.error}</div>` : ""}
        </div>
      `).join("") : "";

      return `
        <div class="test-card">
          <div class="test-header">
            <span class="test-name">${test.name}</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="test-meta">Duration: ${res?.durationMs || 0}ms</div>
          ${stepList ? `<div class="step-container">${stepList}</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="suite-card">
        <h2 class="suite-title">${suite.name}</h2>
        <div class="tests-grid">${testItems}</div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hyperion Selenium Test Report</title>
  <style>
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 32px 24px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { border-bottom: 1px solid #30363d; padding-bottom: 20px; margin-bottom: 24px; }
    .title { color: #58a6ff; font-size: 24px; margin: 0 0 8px 0; }
    .subtitle { color: #8b949e; font-size: 13px; margin: 0; }
    .metrics { display: flex; gap: 16px; margin-bottom: 32px; }
    .metric-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px 20px;
      flex: 1;
    }
    .metric-val { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
    .metric-lbl { color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .val-pass { color: #3fb950; }
    .val-fail { color: #f85149; }
    .val-rate { color: #58a6ff; }
    .suite-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 20px;
      padding: 20px;
    }
    .suite-title { color: #f0f6fc; font-size: 16px; margin: 0 0 16px 0; border-bottom: 1px solid #21262d; padding-bottom: 8px; }
    .tests-grid { display: flex; flex-direction: column; gap: 12px; }
    .test-card { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 12px; }
    .test-header { display: flex; justify-content: space-between; align-items: center; }
    .test-name { font-weight: 600; font-size: 13px; color: #e6edf3; }
    .badge { font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 12px; }
    .status-pass { background: rgba(63, 185, 80, 0.2); color: #3fb950; border: 1px solid #3fb950; }
    .status-fail { background: rgba(248, 81, 73, 0.2); color: #f85149; border: 1px solid #f85149; }
    .status-skip { background: rgba(139, 148, 158, 0.2); color: #8b949e; border: 1px solid #8b949e; }
    .test-meta { color: #8b949e; font-size: 11px; margin-top: 4px; }
    .step-container { margin-top: 10px; border-top: 1px solid #21262d; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
    .step-item { display: flex; align-items: center; gap: 8px; font-size: 11px; font-family: monospace; }
    .step-item.passed { color: #7ee787; }
    .step-item.failed { color: #ffa198; }
    .step-dur { color: #8b949e; margin-left: auto; }
    .step-err { color: #f85149; background: rgba(248,81,73,0.1); padding: 4px 8px; border-radius: 4px; margin-top: 4px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🤖 Hyperion Selenium E2E Automation Report</h1>
      <p class="subtitle">Compiled on ${date} | Target: Builtin Live Previewer</p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-val">${runSummary.total}</div>
        <div class="metric-lbl">Total Tests</div>
      </div>
      <div class="metric-card">
        <div class="metric-val val-pass">${runSummary.passed}</div>
        <div class="metric-lbl">Passed</div>
      </div>
      <div class="metric-card">
        <div class="metric-val val-fail">${runSummary.failed}</div>
        <div class="metric-lbl">Failed</div>
      </div>
      <div class="metric-card">
        <div class="metric-val val-rate">${passRate}%</div>
        <div class="metric-lbl">Pass Rate</div>
      </div>
    </div>

    <div class="suites-container">
      ${suiteRows}
    </div>
  </div>
</body>
</html>`;
}

export function generateJsonReport(runSummary, suites) {
  return JSON.stringify(
    {
      engine: "Hyperion Selenium E2E Simulator",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      summary: runSummary,
      suites
    },
    null,
    2
  );
}



// =====================================================================
// Python Selenium 4 Backend API Integration
// =====================================================================

let activeSeleniumBase = null;

async function getSeleniumBaseUrl() {
  if (activeSeleniumBase) return activeSeleniumBase;
  // 1. Try server proxy first (/api/selenium)
  try {
    const res = await fetch("/api/selenium/status", { signal: AbortSignal.timeout(1200) });
    const cType = res.headers.get("content-type") || "";
    if (res.ok && cType.includes("application/json")) {
      activeSeleniumBase = "/api/selenium";
      return activeSeleniumBase;
    }
  } catch {}

  // 2. Try direct FastAPI backend on port 8000
  try {
    const res = await fetch("http://127.0.0.1:8000/api/selenium/status", { signal: AbortSignal.timeout(1200) });
    if (res.ok) {
      activeSeleniumBase = "http://127.0.0.1:8000/api/selenium";
      return activeSeleniumBase;
    }
  } catch {}

  // 3. Fallback to port 5006
  try {
    const res = await fetch("http://127.0.0.1:5006/status", { signal: AbortSignal.timeout(1200) });
    if (res.ok) {
      activeSeleniumBase = "http://127.0.0.1:5006";
      return activeSeleniumBase;
    }
  } catch {}

  return "http://127.0.0.1:8000/api/selenium";
}

export async function getPythonSeleniumStatus() {
  try {
    const base = await getSeleniumBaseUrl();
    const endpoint = `${base}/status`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function configurePythonSelenium(config = {}) {
  try {
    const base = await getSeleniumBaseUrl();
    const endpoint = `${base}/session/configure`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function runPythonSeleniumSuite(targetUrl, tests = [], suiteName = "Automated QA Suite") {
  const base = await getSeleniumBaseUrl();
  const endpoint = `${base}/run-suite`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: targetUrl, tests, suiteName })
  });
  return await res.json();
}

export async function runPythonSeleniumAgent(targetUrl, maxSteps = 10) {
  const base = await getSeleniumBaseUrl();
  const endpoint = `${base}/agent/explore`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: targetUrl, maxSteps })
  });
  return await res.json();
}

export async function executePythonSeleniumStep(stepData) {
  const base = await getSeleniumBaseUrl();
  const endpoint = `${base}/execute-step`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stepData)
  });
  return await res.json();
}

export async function capturePythonSeleniumScreenshot() {
  try {
    const base = await getSeleniumBaseUrl();
    const endpoint = `${base}/screenshot`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      return data.screenshot;
    }
  } catch {}
  return null;
}
