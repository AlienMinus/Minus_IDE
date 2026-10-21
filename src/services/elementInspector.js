/**
 * Hyperion Chromium Element Inspector & Selector Engine
 * Provides a Chrome DevTools-style "Inspect & Select Element" interactive overlay
 * over the builtin previewer iframe for the Agentic Tester & Selenium QA Studio.
 */

import { getActivePreviewerIframe, getSafeIframeDocument } from "./seleniumEngine.js";

/**
 * Generate a clean, unique, and robust CSS selector for any DOM element.
 */
export function generateBestSelector(el, doc = null) {
  if (!el || !el.tagName) return "";
  const documentRoot = doc || el.ownerDocument || document;
  const tag = el.tagName.toLowerCase();

  // 1. Unique ID
  if (el.id && typeof el.id === "string" && !/^[0-9]/.test(el.id)) {
    const escaped = CSS.escape ? CSS.escape(el.id) : el.id;
    const byId = `#${escaped}`;
    try {
      if (documentRoot.querySelectorAll(byId).length === 1) return byId;
    } catch {}
  }

  // 2. data-testid attribute
  const testId = el.getAttribute("data-testid") || el.getAttribute("data-test") || el.getAttribute("data-cy");
  if (testId) {
    const sel = `[data-testid="${testId}"]`;
    try {
      if (documentRoot.querySelectorAll(sel).length === 1) return sel;
    } catch {}
  }

  // 3. Name attribute for form controls
  const name = el.getAttribute("name");
  if (name && ["input", "select", "textarea", "button"].includes(tag)) {
    const sel = `${tag}[name="${name}"]`;
    try {
      if (documentRoot.querySelectorAll(sel).length === 1) return sel;
    } catch {}
  }

  // 4. aria-label if concise and unique
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.length < 40) {
    const sel = `${tag}[aria-label="${ariaLabel.replace(/"/g, '\\"')}"]`;
    try {
      if (documentRoot.querySelectorAll(sel).length === 1) return sel;
    } catch {}
  }

  // 5. Distinctive anchor href
  if (tag === "a") {
    const href = el.getAttribute("href");
    if (href && href !== "#" && !href.startsWith("javascript:")) {
      const sel = `a[href="${href}"]`;
      try {
        if (documentRoot.querySelectorAll(sel).length === 1) return sel;
      } catch {}
    }
  }

  // 6. Semantic class names (filtering out dynamic state classes)
  if (el.className && typeof el.className === "string") {
    const classes = el.className
      .trim()
      .split(/\s+/)
      .filter((c) => c && !c.includes(":") && !/^(active|selected|hover|focus|open|closed|show|hide)$/i.test(c))
      .slice(0, 2);

    if (classes.length > 0) {
      const sel = `${tag}.${classes.join(".")}`;
      try {
        if (documentRoot.querySelectorAll(sel).length === 1) return sel;
      } catch {}
    }
  }

  // 7. Hierarchical path traversal
  const path = [];
  let curr = el;
  while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== documentRoot.body && curr !== documentRoot.documentElement) {
    let selector = curr.tagName.toLowerCase();
    if (curr.id && !/^[0-9]/.test(curr.id)) {
      selector += `#${CSS.escape ? CSS.escape(curr.id) : curr.id}`;
      path.unshift(selector);
      break;
    }
    const parent = curr.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === curr.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(curr) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    path.unshift(selector);
    curr = curr.parentElement;
    if (path.length >= 4) break;
  }

  return path.join(" > ") || tag;
}

/**
 * Generate a clean, human-readable XPath expression.
 */
export function generateBestXPath(el) {
  if (!el || !el.tagName) return "";
  const tag = el.tagName.toLowerCase();

  if (el.id && typeof el.id === "string") {
    return `//${tag}[@id="${el.id}"]`;
  }

  const aria = el.getAttribute("aria-label");
  if (aria) {
    return `//${tag}[@aria-label="${aria}"]`;
  }

  const name = el.getAttribute("name");
  if (name) {
    return `//${tag}[@name="${name}"]`;
  }

  const text = (el.innerText || el.textContent || "").trim();
  if (text && text.length < 35 && ["button", "a", "span", "h1", "h2", "h3", "label"].includes(tag)) {
    return `//${tag}[contains(normalize-space(), "${text.replace(/"/g, '\\"')}")]`;
  }

  if (el.className && typeof el.className === "string") {
    const primaryClass = el.className.trim().split(/\s+/)[0];
    if (primaryClass) {
      return `//${tag}[contains(@class, "${primaryClass}")]`;
    }
  }

  return `//${tag}`;
}

/**
 * Derive implicit or explicit W3C ARIA role and accessible name for Testing Library locators.
 */
export function getAriaRoleAndName(el) {
  if (!el || !el.tagName) return { role: "", name: "" };
  const tag = el.tagName.toLowerCase();
  const explicitRole = el.getAttribute("role");

  let role = explicitRole || "";
  if (!role) {
    switch (tag) {
      case "a":
        if (el.hasAttribute("href")) role = "link";
        break;
      case "button":
        role = "button";
        break;
      case "input": {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        if (["button", "submit", "reset"].includes(type)) role = "button";
        else if (type === "checkbox") role = "checkbox";
        else if (type === "radio") role = "radio";
        else if (type === "search") role = "searchbox";
        else role = "textbox";
        break;
      }
      case "textarea":
        role = "textbox";
        break;
      case "select":
        role = "combobox";
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        role = "heading";
        break;
      case "img":
        role = "img";
        break;
      case "nav":
        role = "navigation";
        break;
      case "header":
        role = "banner";
        break;
      case "footer":
        role = "contentinfo";
        break;
      case "main":
        role = "main";
        break;
      default:
        role = "";
    }
  }

  const accessibleName = (
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    (el.innerText || el.textContent || "").trim() ||
    el.getAttribute("alt") ||
    el.getAttribute("placeholder") ||
    ""
  ).slice(0, 45);

  return { role, name: accessibleName };
}

/**
 * Generate formatted Testing Library locator expression.
 */
export function generateTestingLibraryLocator(el) {
  const { role, name } = getAriaRoleAndName(el);
  if (role && name) {
    return `By.role("${role}", { name: "${name}" })`;
  }
  if (role) {
    return `By.role("${role}")`;
  }
  const text = (el.innerText || el.textContent || "").trim();
  if (text && text.length < 35) {
    return `By.text("${text}")`;
  }
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) {
    return `By.placeholderText("${placeholder}")`;
  }
  return `By.css("${generateBestSelector(el)}")`;
}

/**
 * Inspect complete metadata of any target DOM element.
 */
export function inspectElementSummary(el, doc = null) {
  if (!el || !el.tagName) return null;
  const rect = el.getBoundingClientRect();
  const { role, name: accessibleName } = getAriaRoleAndName(el);

  const attributes = {};
  if (el.attributes) {
    for (const attr of Array.from(el.attributes)) {
      attributes[attr.name] = attr.value;
    }
  }

  const rawText = (el.innerText || el.textContent || "").trim();

  return {
    tagName: el.tagName.toLowerCase(),
    id: el.id || "",
    className: el.className || "",
    classList: el.classList ? Array.from(el.classList) : [],
    text: rawText.length > 80 ? rawText.slice(0, 80) + "..." : rawText,
    fullText: rawText,
    bestSelector: generateBestSelector(el, doc),
    xpath: generateBestXPath(el),
    testingLibrary: generateTestingLibraryLocator(el),
    role: role || "generic",
    accessibleName,
    attributes,
    dimensions: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left)
    },
    elementRef: el
  };
}

/**
 * Chromium-Style Element Inspector Controller
 * Manages the interactive hover highlight overlay, floating dimension badge,
 * and mouse-click selection mechanics for the previewer iframe.
 */
export class ChromiumElementInspector {
  constructor() {
    this.isActive = false;
    this.currentHoveredEl = null;
    this.selectedElement = null;
    this.onSelectCallback = null;
    this.onHoverCallback = null;
    this.onCancelCallback = null;

    // Overlay DOM nodes
    this.overlayContainer = null;
    this.highlightBox = null;
    this.tooltipBadge = null;

    // Bound event listeners
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleClick = this.onElementClick.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleScroll = this.onViewportChange.bind(this);
  }

  /**
   * Mount the high-tech highlight overlay in the parent document.
   */
  ensureOverlayMounted() {
    if (this.overlayContainer && document.body.contains(this.overlayContainer)) {
      return;
    }

    const existing = document.getElementById("__hyperion_inspect_overlay_root__");
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = "__hyperion_inspect_overlay_root__";
    root.style.position = "fixed";
    root.style.top = "0";
    root.style.left = "0";
    root.style.width = "100vw";
    root.style.height = "100vh";
    root.style.pointerEvents = "none";
    root.style.zIndex = "9999998";
    root.style.overflow = "hidden";
    root.style.display = "none";

    // Chromium-Style Highlight Box (Translucent blue fill + solid border + subtle glow)
    const box = document.createElement("div");
    box.id = "__hyperion_inspect_highlight_box__";
    box.style.position = "absolute";
    box.style.pointerEvents = "none";
    box.style.transition = "all 0.08s ease-out";
    box.style.background = "rgba(56, 117, 215, 0.32)";
    box.style.border = "1.5px solid #00f2fe";
    box.style.boxShadow = "0 0 12px rgba(0, 242, 254, 0.45), inset 0 0 8px rgba(56, 117, 215, 0.3)";
    box.style.borderRadius = "2px";
    box.style.boxSizing = "border-box";
    box.style.display = "none";

    // Floating DevTools Tag & Size Tooltip Badge
    const tooltip = document.createElement("div");
    tooltip.id = "__hyperion_inspect_tooltip__";
    tooltip.style.position = "absolute";
    tooltip.style.pointerEvents = "none";
    tooltip.style.background = "rgba(13, 20, 36, 0.96)";
    tooltip.style.border = "1px solid #00f2fe";
    tooltip.style.color = "#ffffff";
    tooltip.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    tooltip.style.fontSize = "11px";
    tooltip.style.lineHeight = "1.3";
    tooltip.style.padding = "4px 8px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 242, 254, 0.35)";
    tooltip.style.whiteSpace = "nowrap";
    tooltip.style.zIndex = "9999999";
    tooltip.style.display = "none";
    tooltip.style.backdropFilter = "blur(6px)";

    root.appendChild(box);
    root.appendChild(tooltip);
    document.body.appendChild(root);

    this.overlayContainer = root;
    this.highlightBox = box;
    this.tooltipBadge = tooltip;
  }

  /**
   * Start interactive inspection mode on the active previewer iframe.
   */
  start(options = {}) {
    this.onSelectCallback = options.onSelect || null;
    this.onHoverCallback = options.onHover || null;
    this.onCancelCallback = options.onCancel || null;
    this.ensureOverlayMounted();

    const iframe = getActivePreviewerIframe();
    if (!iframe) {
      console.warn("[ChromiumInspector] No active previewer iframe found to inspect.");
      return false;
    }

    const doc = getSafeIframeDocument(iframe);
    if (!doc || !doc.body) {
      console.warn("[ChromiumInspector] Previewer iframe document is not accessible.");
      return false;
    }

    this.isActive = true;
    this.overlayContainer.style.display = "block";

    // Attach listeners directly inside iframe document
    doc.addEventListener("mousemove", this.handleMouseMove, true);
    doc.addEventListener("click", this.handleClick, true);
    doc.addEventListener("scroll", this.handleScroll, true);
    doc.defaultView?.addEventListener("resize", this.handleScroll);
    doc.defaultView?.addEventListener("keydown", this.handleKeyDown, true);

    // Also attach on parent window for Escape cancellation & split-pane resize tracking
    window.addEventListener("keydown", this.handleKeyDown, true);
    window.addEventListener("resize", this.handleScroll);
    window.addEventListener("scroll", this.handleScroll, true);

    // Set crosshair cursor in iframe body
    if (doc.body) {
      doc.body.dataset.hyperionInspectPreviousCursor = doc.body.style.cursor || "";
      doc.body.style.cursor = "crosshair";
    }

    window.dispatchEvent(new CustomEvent("hyperion:inspect-mode-changed", { detail: { active: true } }));
    return true;
  }

  /**
   * Stop inspection mode and clean up overlays and event listeners.
   */
  stop(clearSelection = false) {
    this.isActive = false;

    const iframe = getActivePreviewerIframe();
    if (iframe) {
      const doc = getSafeIframeDocument(iframe);
      if (doc) {
        doc.removeEventListener("mousemove", this.handleMouseMove, true);
        doc.removeEventListener("click", this.handleClick, true);
        doc.defaultView?.removeEventListener("keydown", this.handleKeyDown, true);

        if (doc.body) {
          doc.body.style.cursor = doc.body.dataset.hyperionInspectPreviousCursor || "";
          delete doc.body.dataset.hyperionInspectPreviousCursor;
        }

        // If selection is being cleared, remove scroll and resize listeners
        if (clearSelection || !this.selectedElement) {
          doc.removeEventListener("scroll", this.handleScroll, true);
          doc.defaultView?.removeEventListener("resize", this.handleScroll);
        }
      }
    }

    window.removeEventListener("keydown", this.handleKeyDown, true);

    if (clearSelection || !this.selectedElement) {
      window.removeEventListener("resize", this.handleScroll);
      window.removeEventListener("scroll", this.handleScroll, true);
      this.selectedElement = null;
      this.clearHighlight();
    }

    window.dispatchEvent(new CustomEvent("hyperion:inspect-mode-changed", { detail: { active: false } }));
  }

  toggle(options = {}) {
    if (this.isActive) {
      this.stop(false);
      return false;
    } else {
      return this.start(options);
    }
  }

  onMouseMove(e) {
    if (!this.isActive) return;

    const iframe = getActivePreviewerIframe();
    if (!iframe) return;
    const doc = getSafeIframeDocument(iframe);
    if (!doc) return;

    const targetEl = doc.elementFromPoint(e.clientX, e.clientY);
    if (!targetEl || targetEl === doc.body || targetEl === doc.documentElement) {
      this.hideHighlight();
      return;
    }

    this.currentHoveredEl = targetEl;
    this.updateHighlight(targetEl, iframe);

    if (this.onHoverCallback) {
      const summary = inspectElementSummary(targetEl, doc);
      this.onHoverCallback(summary);
    }
  }

  onElementClick(e) {
    if (!this.isActive) return;

    // Prevent navigation, form submission, or default actions while inspecting
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const iframe = getActivePreviewerIframe();
    if (!iframe) return;
    const doc = getSafeIframeDocument(iframe);
    if (!doc) return;

    const targetEl = this.currentHoveredEl || doc.elementFromPoint(e.clientX, e.clientY);
    if (!targetEl || targetEl === doc.body || targetEl === doc.documentElement) {
      return;
    }

    const summary = inspectElementSummary(targetEl, doc);
    this.selectedElement = summary;

    // Freeze highlight on selected element with high-contrast accent
    this.updateHighlight(targetEl, iframe, true);

    if (this.onSelectCallback) {
      this.onSelectCallback(summary);
    }

    window.dispatchEvent(
      new CustomEvent("hyperion:inspect-element-selected", { detail: summary })
    );

    // Auto-stop inspection after selection so user can immediately interact with the inspector panel
    this.stop(false);
  }

  onKeyDown(e) {
    if (e.key === "Escape" && this.isActive) {
      e.preventDefault();
      this.stop(true);
      if (this.onCancelCallback) this.onCancelCallback();
    }
  }

  onViewportChange() {
    if (!this.highlightBox || this.highlightBox.style.display === "none") return;
    const elToTrack = (this.isActive ? this.currentHoveredEl : this.selectedElement?.elementRef) || null;
    const iframe = getActivePreviewerIframe();
    if (elToTrack && iframe && typeof elToTrack.getBoundingClientRect === "function") {
      this.updateHighlight(elToTrack, iframe, !this.isActive);
    }
  }

  /**
   * Position the highlight rectangle and floating Chromium DevTools tooltip badge.
   */
  updateHighlight(el, iframe, isSelected = false) {
    if (!el || typeof el.getBoundingClientRect !== "function" || !this.highlightBox) return;

    const iframeRect = iframe.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (elRect.width <= 0 || elRect.height <= 0) {
      this.hideHighlight();
      return;
    }

    const top = iframeRect.top + elRect.top;
    const left = iframeRect.left + elRect.left;
    const width = elRect.width;
    const height = elRect.height;

    this.ensureOverlayMounted();
    this.overlayContainer.style.display = "block";

    // Highlight Box Styling
    this.highlightBox.style.display = "block";
    this.highlightBox.style.top = `${top}px`;
    this.highlightBox.style.left = `${left}px`;
    this.highlightBox.style.width = `${width}px`;
    this.highlightBox.style.height = `${height}px`;

    if (isSelected) {
      this.highlightBox.style.background = "rgba(0, 242, 254, 0.28)";
      this.highlightBox.style.border = "2px solid #00f2fe";
      this.highlightBox.style.boxShadow = "0 0 16px rgba(0, 242, 254, 0.75), inset 0 0 10px rgba(0, 242, 254, 0.35)";
    } else {
      this.highlightBox.style.background = "rgba(56, 117, 215, 0.32)";
      this.highlightBox.style.border = "1.5px solid #38bdf8";
      this.highlightBox.style.boxShadow = "0 0 10px rgba(56, 189, 248, 0.4)";
    }

    // Build Floating Tooltip HTML
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `<span style="color:#fbbf24;">#${el.id}</span>` : "";
    const primaryClass = el.className && typeof el.className === "string"
      ? `<span style="color:#38bdf8;">.${el.className.trim().split(/\s+/)[0]}</span>`
      : "";
    const dimText = `<span style="color:#e2e8f0; margin-left: 6px; font-weight: bold;">${Math.round(width)} × ${Math.round(height)}</span>`;
    const { role, name } = getAriaRoleAndName(el);
    const a11yText = role ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">role: <span style="color:#00f2fe;">${role}</span>${name ? ` | "${name.slice(0, 24)}"` : ""}</div>` : "";

    this.tooltipBadge.innerHTML = `
      <div style="display: flex; align-items: center; gap: 2px;">
        <span style="color:#c084fc; font-weight: bold;">${tag}</span>${id}${primaryClass}${dimText}
      </div>
      ${a11yText}
    `;
    this.tooltipBadge.style.display = "block";

    // Position tooltip: above element if space allows, otherwise below
    const tooltipHeight = 36;
    let tooltipTop = top - tooltipHeight - 6;
    if (tooltipTop < iframeRect.top + 5) {
      tooltipTop = top + height + 6;
    }
    const tooltipLeft = Math.max(iframeRect.left + 8, Math.min(iframeRect.right - 260, left));

    this.tooltipBadge.style.top = `${tooltipTop}px`;
    this.tooltipBadge.style.left = `${tooltipLeft}px`;
  }

  hideHighlight() {
    if (this.highlightBox) this.highlightBox.style.display = "none";
    if (this.tooltipBadge) this.tooltipBadge.style.display = "none";
  }

  clearHighlight() {
    this.selectedElement = null;
    this.hideHighlight();
    if (this.overlayContainer) {
      this.overlayContainer.style.display = "none";
    }
    window.removeEventListener("resize", this.handleScroll);
    window.removeEventListener("scroll", this.handleScroll, true);
    const iframe = getActivePreviewerIframe();
    if (iframe) {
      const doc = getSafeIframeDocument(iframe);
      if (doc) {
        doc.removeEventListener("scroll", this.handleScroll, true);
        doc.defaultView?.removeEventListener("resize", this.handleScroll);
      }
    }
  }
}

export const globalElementInspector = new ChromiumElementInspector();
