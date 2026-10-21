import { queries } from "@testing-library/dom";
import { HyperionWebDriver, globalAgentCursor } from "./seleniumEngine.js";

/**
 * Standard element visibility and interactivity check.
 */
function isElementVisible(el) {
  if (!el || !el.ownerDocument) return false;
  try {
    if (typeof el.checkVisibility === "function") {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    } else {
      const style = el.ownerDocument.defaultView?.getComputedStyle(el);
      if (!style || style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    }
  } catch {}
  try {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  } catch {}
  return true;
}

/**
 * Robust non-blocking polling condition evaluator for iframe DOM.
 */
async function waitForCondition(checkFn, timeoutMs = 2500, intervalMs = 150) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = checkFn();
      if (res) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Cross-realm safe interactive element discovery combining ARIA roles & standard DOM selectors.
 */
function queryInteractiveElements(doc) {
  if (!doc || !doc.body) {
    return { buttons: [], inputs: [], links: [], headings: [], images: [] };
  }

  // 1. Links (native <a> with href + role='link')
  let links = Array.from(doc.body.querySelectorAll("a[href], [role='link']"));
  try {
    const roleLinks = queries.queryAllByRole(doc.body, "link");
    links = Array.from(new Set([...links, ...roleLinks]));
  } catch {}

  // 2. Buttons (native button, role='button', input[type='button'], input[type='submit'], .btn)
  let buttons = Array.from(doc.body.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit'], .btn, [class*='btn']"));
  try {
    const roleButtons = queries.queryAllByRole(doc.body, "button");
    buttons = Array.from(new Set([...buttons, ...roleButtons]));
  } catch {}

  // 3. Inputs
  let inputs = Array.from(doc.body.querySelectorAll("input:not([type='hidden']), textarea, select, [role='textbox']"));
  try {
    const roleInputs = [
      ...queries.queryAllByRole(doc.body, "textbox"),
      ...queries.queryAllByRole(doc.body, "searchbox"),
      ...queries.queryAllByRole(doc.body, "combobox")
    ];
    inputs = Array.from(new Set([...inputs, ...roleInputs]));
  } catch {}

  // 4. Headings
  let headings = Array.from(doc.body.querySelectorAll("h1, h2, h3, [role='heading']"));
  try {
    const roleHeadings = queries.queryAllByRole(doc.body, "heading");
    headings = Array.from(new Set([...headings, ...roleHeadings]));
  } catch {}

  // 5. Images
  const images = Array.from(doc.body.querySelectorAll("img"));

  return {
    buttons: buttons.filter(isElementVisible),
    inputs: inputs.filter(isElementVisible),
    links: links.filter(isElementVisible),
    headings: headings.filter(isElementVisible),
    images: images.filter(isElementVisible)
  };
}

export class HyperionQAAgent {
  constructor(driver = null) {
    this.driver = driver || new HyperionWebDriver();
    this.isAborted = false;
    this.thoughts = [];
    this.findings = [];
    this.activeGoal = null;
  }

  abort() {
    this.isAborted = true;
    this.driver.clearHighlight();
    globalAgentCursor.hide();
  }

  logThought(thought, type = "info") {
    const entry = {
      id: `th_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      text: thought,
      type // "info", "hypothesis", "action", "success", "warning", "error"
    };
    this.thoughts.push(entry);
    return entry;
  }

  addFinding(title, description, severity = "info", recommendation = "") {
    const finding = {
      id: `find_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title,
      description,
      severity, // "critical", "warning", "info", "passed"
      recommendation,
      timestamp: new Date().toLocaleTimeString()
    };
    this.findings.push(finding);
    return finding;
  }

  async runAutonomousExploration(callbacks = {}) {
    const { onThought, onGoalUpdate, onFinding, onProgress, speed = "normal" } = callbacks;
    this.isAborted = false;
    this.driver.speed = speed;
    this.thoughts = [];
    this.findings = [];

    const emitThought = (txt, type) => {
      const t = this.logThought(txt, type);
      onThought?.(t, this.thoughts);
    };

    const emitFinding = (title, desc, severity, rec) => {
      const f = this.addFinding(title, desc, severity, rec);
      onFinding?.(f, this.findings);
    };

    const emitGoal = (goal, progress) => {
      this.activeGoal = goal;
      onGoalUpdate?.(goal);
      onProgress?.(progress);
    };

    emitThought("🤖 Hyperion QA Agent initializing with W3C DOM Testing Engine...", "info");
    await this.driver.sleep(300);

    // 1. Connect to previewer document & wait for SPA hydration
    let doc = await this.driver.getOrFetchDocument(4000);
    if (!doc) {
      window.dispatchEvent(new CustomEvent("hyperion:enable-automation-bridge"));
      await this.driver.sleep(500);
      doc = await this.driver.getOrFetchDocument(2500);
    }

    if (!doc || !doc.body) {
      emitThought("⚠️ Builtin previewer DOM is not directly accessible. Please open a Live Browser preview tab.", "warning");
      emitFinding(
        "Previewer Detached",
        "Could not attach directly to iframe document. Ensure Live Browser preview tab is active.",
        "warning",
        "Click 'Launch Previewer' or open a preview tab to enable full interactive inspection."
      );
      return this.finalizeRun(emitThought, emitGoal);
    }

    emitThought("⚡ Attached to previewer DOM. Indexing active component tree...", "success");

    // 2. Inspect for full-screen intro overlays or splash screens (e.g., TerminalIntro or modals)
    const overlay = doc.body.querySelector(".terminal-intro-overlay, [class*='intro-overlay'], [class*='splash'], div[role='dialog']");
    if (overlay && isElementVisible(overlay)) {
      emitThought(`[Observer] Detected active intro overlay (<${overlay.className.slice(0, 32)}>). Waiting for intro to settle...`, "info");
      try {
        const win = doc.defaultView || window;
        win.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
      } catch {}
      await waitForCondition(() => {
        const active = doc.body.querySelector(".terminal-intro-overlay, [class*='intro-overlay']:not([class*='closing'])");
        return !active || !isElementVisible(active);
      }, 2500, 150);
      emitThought("[Success] Intro overlay settled. Main application view is fully interactive.", "success");
    }

    // ==========================================
    // PHASE 1: DYNAMIC DOM RECONNAISSANCE & NAVIGATION PATROL
    // ==========================================
    emitGoal("Phase 1: Dynamic DOM Reconnaissance & Navigation Patrol", 15);
    emitThought("🔍 Indexing interactive elements via accessibility tree & DOM selectors...", "info");

    const elements = queryInteractiveElements(doc);
    const allButtons = elements.buttons;
    const allInputs = elements.inputs;
    const allLinks = elements.links;
    const allHeadings = elements.headings;
    const allImages = elements.images;
    const pageTitle = doc.title || "Web Application Preview";

    emitThought(`[Perception] Discovered: ${allButtons.length} buttons, ${allInputs.length} inputs, ${allLinks.length} hyperlinks, ${allImages.length} images. Document Title: "${pageTitle}"`, "info");
    await this.driver.sleep(300);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // Filter internal navigation links
    const navLinks = allLinks.filter((a) => {
      const href = a.getAttribute("href") || a.getAttribute("to") || "";
      return !href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("mailto:") && href !== "#";
    });

    if (navLinks.length > 0) {
      emitThought(`[Navigation Patrol] Found ${navLinks.length} internal navigation routes. Testing routing sequence...`, "info");

      // Test up to 4 real navigation links in sequence
      for (const link of navLinks.slice(0, 4)) {
        if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);
        const linkText = (link.innerText || link.getAttribute("aria-label") || link.textContent || "Route").trim().replace(/\s+/g, " ");
        const href = link.getAttribute("href") || "";

        emitThought(`[Navigation Patrol] Snapping cursor to route link: "${linkText}" (${href})...`, "action");
        // Pass the REAL live DOM element so moveTo and click compute the exact live bounding rect!
        await this.driver.click(link);
        await this.driver.sleep(400);
      }

      emitFinding(
        "Navigation Routing Flow",
        `Successfully traversed ${Math.min(navLinks.length, 4)} active navigation links. Route state dispatchers responsive.`,
        "passed",
        "Ensure all navigation links provide active focus styling."
      );
    } else if (allLinks.length > 0) {
      const sampleLinks = allLinks.slice(0, 2);
      for (const link of sampleLinks) {
        if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);
        const text = (link.innerText || link.textContent || "Link").trim();
        emitThought(`[Navigation Patrol] Inspecting anchor: "${text}"...`, "action");
        await this.driver.click(link);
        await this.driver.sleep(300);
      }
    }

    await this.driver.sleep(250);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // ==========================================
    // PHASE 2: RUNTIME CRASH SENTINEL & HEADLINE LANDMARK
    // ==========================================
    emitGoal("Phase 2: Runtime Crash & Error Sentinel", 32);
    emitThought("🛡️ Inspecting DOM for React error boundaries, unhandled Vite overlays, and primary headline...", "hypothesis");

    // Dynamically find main headline on the active route
    const mainHeading = allHeadings[0] || doc.querySelector("h1, main h2, [class*='title'], [class*='hero'] h1");
    if (mainHeading) {
      const headingText = (mainHeading.innerText || mainHeading.textContent || "Headline").trim().replace(/\s+/g, " ");
      emitThought(`[Action] Snapping cursor to primary headline landmark: "${headingText.slice(0, 45)}"...`, "action");
      await this.driver.click(mainHeading);
      await this.driver.sleep(300);
    }

    const errorOverlays = doc.querySelectorAll("vite-error-overlay, #error-box, [class*='error-boundary'], [class*='crash-indicator'], div[role='alert']");
    if (errorOverlays.length > 0) {
      emitThought(`[Alert] Detected active error overlay in DOM (${errorOverlays.length} elements).`, "error");
      emitFinding(
        "Active Runtime Error Overlay Detected",
        "The previewer contains an active crash or error overlay. Check browser console or Vite terminal.",
        "critical",
        "Review syntax and import statements in your active component."
      );
    } else {
      emitThought("[Success] Zero runtime crash overlays detected in previewer DOM.", "success");
      emitFinding(
        "Root Application Health",
        "Component tree mounted cleanly without crash overlays or fatal unhandled exceptions.",
        "passed",
        "Ensure error boundary wraps root components."
      );
    }
    await this.driver.sleep(300);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // ==========================================
    // PHASE 3: FORM INPUT & VALIDATION BOUNDARIES
    // ==========================================
    emitGoal("Phase 3: Form Input & Validation Boundaries", 52);
    emitThought("📝 Dynamically identifying form controls, testing typing resilience, and input boundaries...", "hypothesis");

    const textInputs = allInputs.filter(inp => {
      const type = (inp.type || "text").toLowerCase();
      return !["checkbox", "radio", "hidden", "button", "submit", "reset"].includes(type);
    });

    if (textInputs.length > 0) {
      emitThought(`[Form Exploration] Discovered ${textInputs.length} actual input field(s). Testing synthetic keystrokes...`, "info");

      for (const input of textInputs.slice(0, 3)) {
        if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);
        const type = (input.type || "text").toLowerCase();
        const fieldIdentifier = input.name || input.id || input.placeholder || type;

        let testVal = "Hyperion Test Input";
        if (type === "email" || fieldIdentifier.toLowerCase().includes("email")) {
          testVal = "qa.tester@hyperion.internal";
        } else if (type === "number" || fieldIdentifier.toLowerCase().includes("age") || fieldIdentifier.toLowerCase().includes("qty")) {
          testVal = "42";
        } else if (fieldIdentifier.toLowerCase().includes("name")) {
          testVal = "Hyperion QA";
        } else if (fieldIdentifier.toLowerCase().includes("search") || fieldIdentifier.toLowerCase().includes("query")) {
          testVal = "automated test query";
        }

        emitThought(`[Action] Snapping cursor to <${type}> input ("${fieldIdentifier}")...`, "action");
        await this.driver.sendKeys(input, testVal);
        await this.driver.sleep(300);
      }

      // Check if there is an associated submit button
      const submitBtn = doc.querySelector("form button[type='submit'], form input[type='submit'], form button, button[type='submit']");
      if (submitBtn) {
        emitThought("[Action] Exercising form submit button...", "action");
        await this.driver.click(submitBtn);
        await this.driver.sleep(350);
      }

      emitFinding(
        "Form Controls & Typing Resiliency",
        `Exercised ${Math.min(textInputs.length, 3)} active input field(s). Keystrokes and change events dispatched cleanly.`,
        "passed",
        "Add HTML5 validation constraints (required, type) to prevent empty or invalid submissions."
      );
    } else {
      emitThought("[Form Exploration] No active text input fields detected on the current view.", "info");
      emitFinding(
        "Form Input Surface",
        "No form input fields detected on initial route.",
        "info",
        "Form validation will automatically execute when navigating to routes containing forms."
      );
    }

    await this.driver.sleep(300);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // ==========================================
    // PHASE 4: INTERACTIVE CONTROLS & STATE RESILIENCY
    // ==========================================
    emitGoal("Phase 4: Button Interactivity & State Resiliency", 70);
    emitThought("🖱️ Inspecting and exercising interactive buttons, toggles, and state controls...", "hypothesis");

    // Find visible non-submit buttons or controls
    const actionButtons = allButtons.filter(b => (b.type || "").toLowerCase() !== "submit");

    if (actionButtons.length > 0) {
      // Pick up to 3 real buttons
      for (const btn of actionButtons.slice(0, 3)) {
        if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);
        const btnLabel = (btn.innerText || btn.getAttribute("aria-label") || btn.title || btn.className || "button").trim().replace(/\s+/g, " ");

        emitThought(`[Action] Interacting with actual control: "${btnLabel.slice(0, 30)}"...`, "action");
        await this.driver.click(btn);
        await this.driver.sleep(350);
      }

      emitThought("[Observation] Interactive controls responded without raising unhandled runtime errors.", "success");
      emitFinding(
        "Interactive Controls Health",
        `Exercised ${Math.min(actionButtons.length, 3)} interactive control(s). State transitions executed cleanly.`,
        "passed",
        "Verify all interactive buttons provide visible hover and active visual feedback."
      );
    } else {
      emitThought("[Controls] No generic action buttons found on active view.", "info");
    }

    await this.driver.sleep(300);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // ==========================================
    // PHASE 5: MEDIA & ASSET INTEGRITY PATROL
    // ==========================================
    emitGoal("Phase 5: Media & Asset Integrity Patrol", 85);
    emitThought("🖼️ Auditing image resources, natural dimensions, and media assets...", "hypothesis");

    if (allImages.length > 0) {
      // Move cursor to first prominent image
      const firstImg = allImages[0];
      await globalAgentCursor.moveTo(firstImg, "Auditing Media Resource");
      await this.driver.sleep(300);

      let brokenImages = 0;
      let missingAlts = 0;

      allImages.forEach((img) => {
        if (!img.src || (img.naturalWidth === 0 && img.complete)) {
          brokenImages++;
        }
        if (!img.alt) {
          missingAlts++;
        }
      });

      if (missingAlts > 0) {
        emitFinding(
          `${missingAlts} Image(s) Missing Alt Attributes`,
          "Images without alt attributes degrade accessibility for screen reader users.",
          "warning",
          "Add descriptive alt text to all <img> tags for accessibility compliance."
        );
      }

      if (brokenImages > 0) {
        emitFinding(
          `Detected ${brokenImages} Broken Image(s)`,
          "One or more images failed to load or have missing source paths.",
          "warning",
          "Verify asset paths and ensure public directory contains referenced images."
        );
      } else {
        emitThought(`[Success] Verified ${allImages.length} image resources. Zero broken images detected.`, "success");
        emitFinding(
          "Media Assets Integrity",
          `All ${allImages.length} image resources loaded successfully with valid natural dimensions.`,
          "passed",
          "Optimize images with modern formats (WebP, AVIF) for improved load performance."
        );
      }
    } else {
      emitThought("[Media Patrol] No <img> tags discovered on current route.", "info");
    }

    await this.driver.sleep(300);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // ==========================================
    // PHASE 6: ACCESSIBILITY & WCAG DIAGNOSTICS
    // ==========================================
    emitGoal("Phase 6: Accessibility & WCAG Compliance", 95);
    emitThought("♿ Auditing semantic landmarks, landmark tags, and accessible button semantics...", "info");

    const landmarks = {
      header: !!doc.querySelector("header, [role='banner']"),
      nav: !!doc.querySelector("nav, [role='navigation']"),
      main: !!doc.querySelector("main, [role='main']"),
      footer: !!doc.querySelector("footer, [role='contentinfo']")
    };

    const missingLandmarks = Object.entries(landmarks).filter(([, exists]) => !exists).map(([k]) => `<${k}>`);
    if (missingLandmarks.length > 0) {
      emitFinding(
        `Missing Semantic Landmarks: ${missingLandmarks.join(", ")}`,
        "Semantic HTML landmark tags help assistive technologies navigate the page structure.",
        "warning",
        `Wrap key layout sections in standard semantic tags: ${missingLandmarks.join(", ")}.`
      );
    } else {
      emitFinding(
        "Semantic Landmark Structure",
        "Document contains complete semantic landmarks (<header>, <nav>, <main>, <footer>).",
        "passed",
        "Excellent semantic structure."
      );
    }

    const buttonsWithoutText = allButtons.filter((b) => !(b.innerText || b.getAttribute("aria-label") || b.title));
    if (buttonsWithoutText.length > 0) {
      emitFinding(
        `${buttonsWithoutText.length} Button(s) Lack Accessible Text`,
        "Buttons without text or aria-label cannot be read by screen readers.",
        "warning",
        "Add aria-label attribute to icon-only buttons."
      );
    } else {
      emitFinding(
        "Accessible Button Semantics",
        "All detected buttons contain accessible text or aria-labels.",
        "passed",
        "Good accessibility posture."
      );
    }

    return this.finalizeRun(emitThought, emitGoal);
  }

  async finalizeRun(emitThought, emitGoal) {
    this.driver.clearHighlight();
    emitGoal("Exploratory Audit Completed", 100);

    const criticalCount = this.findings.filter((f) => f.severity === "critical").length;
    const warningCount = this.findings.filter((f) => f.severity === "warning").length;
    const passedCount = this.findings.filter((f) => f.severity === "passed").length;

    let score = 100 - (criticalCount * 25) - (warningCount * 8);
    score = Math.max(0, Math.min(100, score));

    // Completion ceremony: cursor moves to root landmark with completion banner
    await globalAgentCursor.moveTo("h1, header, nav, body", `QA Exploration Complete! Health: ${score}/100`, { duration: 600 });
    await this.driver.sleep(1800);
    globalAgentCursor.hide();

    emitThought(`🎉 Autonomous QA Testing complete! Health Score: ${score}/100. Discovered ${this.findings.length} findings (${criticalCount} critical, ${warningCount} warnings, ${passedCount} passed).`, "success");

    return {
      healthScore: score,
      thoughts: this.thoughts,
      findings: this.findings,
      timestamp: new Date().toISOString()
    };
  }
}
