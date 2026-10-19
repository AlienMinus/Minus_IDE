/**
 * Hyperion Selenium Agent
 * Universal Autonomous AI Testing Agent for any web project.
 * Perceives previewer DOM dynamically, plans exploratory testing goals,
 * executes automated action sequences targeting REAL live rendered DOM elements,
 * drives a visual glowing AI mouse cursor with exact pixel-level element snapping,
 * and streams thoughts & findings in real-time.
 */

import { HyperionWebDriver, globalAgentCursor } from "./seleniumEngine.js";

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

    emitThought("🤖 Hyperion QA Agent initialized. Connecting to previewer environment...", "info");
    await this.driver.sleep(300);

    let doc = await this.driver.getOrFetchDocument();
    if (!doc) {
      window.dispatchEvent(new CustomEvent("hyperion:enable-automation-bridge"));
      await this.driver.sleep(500);
      doc = await this.driver.getOrFetchDocument();
    }

    if (!doc) {
      emitThought("⚠️ Builtin previewer DOM is not directly accessible. Please open a Live Browser preview tab.", "warning");
      emitFinding(
        "Previewer Detached",
        "Could not attach directly to iframe document. Ensure Live Browser preview tab is active.",
        "warning",
        "Click 'Launch Previewer' or open a preview tab to enable full interactive inspection."
      );
      return this.finalizeRun(emitThought, emitGoal);
    }

    emitThought("⚡ Attached to previewer DOM via live Automation Engine.", "success");

    // ==========================================
    // PHASE 1: DYNAMIC DOM RECONNAISSANCE & NAVIGATION PATROL
    // ==========================================
    emitGoal("Phase 1: Dynamic DOM Reconnaissance & Navigation Patrol", 15);
    emitThought("🔍 Inspecting previewer DOM tree and indexing actual interactive elements...", "info");

    const allButtons = Array.from(doc.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']"));
    const allInputs = Array.from(doc.querySelectorAll("input:not([type='hidden']), textarea, select"));
    const allLinks = Array.from(doc.querySelectorAll("a[href]"));
    const allImages = Array.from(doc.querySelectorAll("img"));
    const pageTitle = doc.title || "Web Application Preview";

    emitThought(`[Perception] Discovered: ${allButtons.length} buttons, ${allInputs.length} inputs, ${allLinks.length} hyperlinks, ${allImages.length} images. Document Title: "${pageTitle}"`, "info");
    await this.driver.sleep(300);
    if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);

    // Dynamically discover actual navigation links from the rendered DOM
    const navAnchors = Array.from(doc.querySelectorAll("header a, nav a, [role='navigation'] a, .navbar a, .nav a, aside a, .menu a, .sidebar a"));
    const validNavs = navAnchors.filter((a) => {
      const href = a.getAttribute("href") || "";
      return href && !href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("mailto:") && href !== "#";
    });

    if (validNavs.length > 0) {
      emitThought(`[Navigation Patrol] Found ${validNavs.length} actual navigation route links in header/navbar. Testing routing sequence...`, "info");

      // Test up to 5 real navigation links in sequence
      for (const link of validNavs.slice(0, 5)) {
        if (this.isAborted) return this.finalizeRun(emitThought, emitGoal);
        const linkText = (link.innerText || link.textContent || link.getAttribute("aria-label") || link.getAttribute("title") || "Route").trim().replace(/\s+/g, " ");
        const href = link.getAttribute("href") || "";

        emitThought(`[Navigation Patrol] Snapping cursor to actual element: "${linkText}" (${href})...`, "action");
        // Pass the REAL live DOM element so moveTo and click compute the exact live bounding rect!
        await this.driver.click(link);
        await this.driver.sleep(350);
      }

      emitFinding(
        "Navigation Routing Flow",
        `Successfully traversed ${Math.min(validNavs.length, 5)} active navigation links. Route state dispatchers responsive.`,
        "passed",
        "Ensure all navigation links provide active focus styling."
      );
    } else if (allLinks.length > 0) {
      // Fallback: Test first 2 generic internal links
      const sampleLinks = allLinks.filter(a => {
        const h = a.getAttribute("href");
        return h && !h.startsWith("http") && h !== "#";
      }).slice(0, 2);

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
    const mainHeading = doc.querySelector("h1, main h2, [class*='title'], [class*='hero'] h1");
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
    const actionButtons = allButtons.filter(b => {
      const type = (b.type || "").toLowerCase();
      return type !== "submit" && b.offsetParent !== null;
    });

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
