import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaRobot,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaFileDownload,
  FaSync,
  FaBug,
  FaShieldAlt,
  FaListUl,
  FaPlus,
  FaTrash,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronRight,
  FaSave,
  FaDesktop,
  FaTerminal,
  FaCrosshairs,
  FaCopy,
  FaCheck,
  FaMousePointer,
  FaKeyboard,
  FaBullseye,
  FaTimes
} from "react-icons/fa";
import { VscDebugRestart, VscReport, VscBeaker, VscInspect } from "react-icons/vsc";
import {
  HyperionWebDriver,
  getActivePreviewerIframe,
  getSafeIframeDocument,
  generateTestSuites,
  executeTestCase,
  generateMarkdownReport,
  generateHtmlReport,
  generateJsonReport,
  globalAgentCursor
} from "../../services/seleniumEngine";
import { HyperionQAAgent } from "../../services/seleniumAgent";
import { globalElementInspector } from "../../services/elementInspector";
import LiveBrowser from "../LiveBrowser/LiveBrowser";
import useEditor from "../../hooks/useEditor";
import useFile from "../../hooks/useFile";
import "./SeleniumRunner.css";

export default function SeleniumRunner({ isStudioMode = false }) {
  const { openLiveBrowserTab, openFile, files: editorFiles } = useEditor();
  const { createFile, files: workspaceFiles } = useFile() || {};

  // Split-view state for side-by-side previewing inside Selenium Studio
  const [showSplitPreview, setShowSplitPreview] = useState(isStudioMode);

  // Active Sub-tab inside Selenium Runner: "tests" | "agent" | "reports"
  const [activeTab, setActiveTab] = useState("tests");

  // Previewer Connection state
  const [isPreviewerConnected, setIsPreviewerConnected] = useState(false);
  const [previewerTitle, setPreviewerTitle] = useState("");
  const [previewerUrl, setPreviewerUrl] = useState(
    () => (window.__hyperion_previewer_url__ && window.__hyperion_previewer_url__ !== "about:blank")
      ? window.__hyperion_previewer_url__
      : "http://localhost:5174"
  );

  // Test Runner State
  const [testSuites, setTestSuites] = useState([]);
  const [selectedTests, setSelectedTests] = useState({});
  const [expandedSuites, setExpandedSuites] = useState({});
  const [expandedTests, setExpandedTests] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeRunningTestId, setActiveRunningTestId] = useState(null);
  const [speed, setSpeed] = useState("normal"); // slow, normal, fast, turbo

  // Test Results & Reports State
  const [testResults, setTestResults] = useState([]);
  const [runSummary, setRunSummary] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    durationMs: 0
  });

  // Autonomous Agent State
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentGoal, setAgentGoal] = useState("Idle - Ready for exploration");
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentThoughts, setAgentThoughts] = useState([]);
  const [agentFindings, setAgentFindings] = useState([]);
  const [agentHealthScore, setAgentHealthScore] = useState(null);

  // Custom Test Creation Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTestName, setCustomTestName] = useState("");
  const [customTestSelector, setCustomTestSelector] = useState("button");
  const [customTestAction, setCustomTestAction] = useState("click");
  const [customTestValue, setCustomTestValue] = useState("");

  // Chromium Inspect & Select State
  const [isInspectActive, setIsInspectActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [copiedLocator, setCopiedLocator] = useState(null);
  const [inspectTypeInput, setInspectTypeInput] = useState("");

  // Refs for execution abort/pause control
  const driverRef = useRef(null);
  const agentRef = useRef(null);
  const abortFlagRef = useRef(false);
  const pausePromiseResolveRef = useRef(null);

  // Initialize Driver & Element Inspector Listeners
  useEffect(() => {
    driverRef.current = new HyperionWebDriver(getActivePreviewerIframe);

    const handleInspectModeChanged = (e) => {
      setIsInspectActive(!!e.detail?.active);
    };

    const handleElementSelected = (e) => {
      setSelectedElement(e.detail);
    };

    window.addEventListener("hyperion:inspect-mode-changed", handleInspectModeChanged);
    window.addEventListener("hyperion:inspect-element-selected", handleElementSelected);

    const handleInspectShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        handleToggleInspect();
      }
    };
    window.addEventListener("keydown", handleInspectShortcut, true);

    return () => {
      window.removeEventListener("hyperion:inspect-mode-changed", handleInspectModeChanged);
      window.removeEventListener("hyperion:inspect-element-selected", handleElementSelected);
      window.removeEventListener("keydown", handleInspectShortcut, true);
    };
  }, []);

  // Poll for Builtin Previewer detection
  useEffect(() => {
    const checkConnection = () => {
      const iframe = getActivePreviewerIframe();
      if (iframe) {
        setIsPreviewerConnected(true);
        const doc = getSafeIframeDocument(iframe);
        setPreviewerTitle(doc?.title || iframe.title || "Live Previewer Attached");
        try {
          const href = iframe.contentWindow?.location?.href;
          if (href && href !== "about:blank" && !href.startsWith("chrome-error://")) {
            setPreviewerUrl(href);
            window.__hyperion_previewer_url__ = href;
          } else if (iframe.src && iframe.src !== "about:blank") {
            setPreviewerUrl(iframe.src);
            window.__hyperion_previewer_url__ = iframe.src;
          } else {
            // Keep existing non-blank URL or fallback to default
            setPreviewerUrl((prev) => (prev && prev !== "about:blank" ? prev : (window.__hyperion_previewer_url__ || "http://localhost:5174")));
          }
        } catch {
          if (iframe.src && iframe.src !== "about:blank") {
            setPreviewerUrl(iframe.src);
            window.__hyperion_previewer_url__ = iframe.src;
          } else {
            setPreviewerUrl((prev) => (prev && prev !== "about:blank" ? prev : (window.__hyperion_previewer_url__ || "http://localhost:5174")));
          }
        }
      } else {
        setIsPreviewerConnected(false);
        setPreviewerTitle("");
        setPreviewerUrl((prev) => (prev && prev !== "about:blank" ? prev : (window.__hyperion_previewer_url__ || "http://localhost:5174")));
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1500);

    const handleLoaded = () => {
      checkConnection();
      handleGenerateTests();
    };
    window.addEventListener("hyperion:previewer-loaded", handleLoaded);

    return () => {
      clearInterval(interval);
      window.removeEventListener("hyperion:previewer-loaded", handleLoaded);
    };
  }, []);

  // Generate initial test suites when previewer becomes available or on load
  const handleGenerateTests = async () => {
    const iframe = getActivePreviewerIframe();
    let doc = getSafeIframeDocument(iframe);
    if (!doc && driverRef.current) {
      doc = await driverRef.current.getOrFetchDocument();
    }
    const suites = generateTestSuites({
      previewerDoc: doc,
      files: editorFiles || workspaceFiles || []
    });
    setTestSuites(suites);

    // Default select all tests and expand first two suites
    const initialSelection = {};
    const initialExpand = {};
    suites.forEach((s, idx) => {
      if (idx < 2) initialExpand[s.id] = true;
      s.tests.forEach((t) => {
        initialSelection[t.id] = true;
      });
    });
    setSelectedTests(initialSelection);
    setExpandedSuites(initialExpand);
  };

  useEffect(() => {
    handleGenerateTests();
  }, [isPreviewerConnected]);

  // Open Previewer tab if not open
  const handleLaunchPreviewer = () => {
    const target = previewerUrl || window.__hyperion_previewer_url__ || "http://localhost:5174";
    openLiveBrowserTab(target, "Live Browser Preview");
  };

  // Toggle selection
  const toggleSelectTest = (testId) => {
    setSelectedTests((prev) => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  const toggleSelectSuite = (suite) => {
    const allSelected = suite.tests.every((t) => selectedTests[t.id]);
    const updated = { ...selectedTests };
    suite.tests.forEach((t) => {
      updated[t.id] = !allSelected;
    });
    setSelectedTests(updated);
  };

  // Expand / Collapse
  const toggleExpandSuite = (suiteId) => {
    setExpandedSuites((prev) => ({ ...prev, [suiteId]: !prev[suiteId] }));
  };

  const toggleExpandTest = (testId) => {
    setExpandedTests((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  // --- Runner Execution Controls ---

  const waitIfPaused = async () => {
    if (isPaused) {
      await new Promise((resolve) => {
        pausePromiseResolveRef.current = resolve;
      });
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
      if (pausePromiseResolveRef.current) {
        pausePromiseResolveRef.current();
        pausePromiseResolveRef.current = null;
      }
    } else {
      setIsPaused(true);
    }
  };

  const handleStopRun = () => {
    abortFlagRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    setActiveRunningTestId(null);
    driverRef.current?.clearHighlight();
    if (pausePromiseResolveRef.current) {
      pausePromiseResolveRef.current();
      pausePromiseResolveRef.current = null;
    }
  };

  const handleRunAll = async (onlySelected = false) => {
    if (isRunning) return;

    // Ensure previewer iframe exists or auto-launch previewer tab
    const existingIframe = getActivePreviewerIframe();
    if (!existingIframe && !showSplitPreview) {
      const target = previewerUrl || window.__hyperion_previewer_url__ || "http://localhost:5174";
      if (openLiveBrowserTab) {
        openLiveBrowserTab(target, "Live Browser Preview");
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setIsRunning(true);
    setIsPaused(false);
    abortFlagRef.current = false;

    const driver = driverRef.current;
    driver.speed = speed;
    await driver.getOrFetchDocument();

    const testsToRun = [];
    testSuites.forEach((suite) => {
      suite.tests.forEach((test) => {
        if (!onlySelected || selectedTests[test.id]) {
          testsToRun.push(test);
        }
      });
    });

    if (testsToRun.length === 0) {
      setIsRunning(false);
      return;
    }

    const currentResults = [];
    let passedCount = 0;
    let failedCount = 0;
    const startOverall = Date.now();

    for (const test of testsToRun) {
      if (abortFlagRef.current) break;
      await waitIfPaused();

      setActiveRunningTestId(test.id);

      const testResult = await executeTestCase(driver, test, (liveResult) => {
        setTestResults((prev) => {
          const idx = prev.findIndex((r) => r.testId === liveResult.testId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...liveResult };
            return next;
          }
          return [...prev, liveResult];
        });
      });

      currentResults.push(testResult);
      if (testResult.status === "passed") passedCount++;
      else failedCount++;

      setTestResults([...currentResults]);
    }

    driver.clearHighlight();
    setActiveRunningTestId(null);
    setIsRunning(false);

    setRunSummary({
      total: testsToRun.length,
      passed: passedCount,
      failed: failedCount,
      durationMs: Date.now() - startOverall,
      results: currentResults
    });
  };

  // --- Autonomous Agent Controls ---

  const handleStartAgent = async (overrideTarget = null) => {
    if (isAgentRunning) return;

    // Ensure previewer iframe exists or auto-launch previewer tab
    const existingIframe = getActivePreviewerIframe();
    if (!existingIframe && !showSplitPreview) {
      const target = previewerUrl || window.__hyperion_previewer_url__ || "http://localhost:5174";
      if (openLiveBrowserTab) {
        openLiveBrowserTab(target, "Live Browser Preview");
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setIsAgentRunning(true);
    setAgentThoughts([]);
    setAgentFindings([]);
    setAgentHealthScore(null);
    setActiveTab("agent");

    const agent = new HyperionQAAgent(driverRef.current);
    agentRef.current = agent;

    const targetToPrioritize = overrideTarget || selectedElement;

    try {
      const summary = await agent.runAutonomousExploration({
        speed,
        targetedElement: targetToPrioritize,
        onThought: (thought, allThoughts) => {
          setAgentThoughts([...allThoughts]);
        },
        onFinding: (finding, allFindings) => {
          setAgentFindings([...allFindings]);
        },
        onGoalUpdate: (goal) => {
          setAgentGoal(goal);
        },
        onProgress: (p) => {
          setAgentProgress(p);
        }
      });
      setAgentHealthScore(summary.healthScore);
    } catch (err) {
      console.error("[SeleniumAgent] Error running agent:", err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleStopAgent = () => {
    if (agentRef.current) {
      agentRef.current.abort();
    }
    setIsAgentRunning(false);
  };

  // --- Chromium Element Inspector Handlers ---

  const handleToggleInspect = () => {
    if (globalElementInspector.isActive) {
      globalElementInspector.stop(false);
    } else {
      const existingIframe = getActivePreviewerIframe();
      if (!existingIframe && !showSplitPreview) {
        setShowSplitPreview(true);
      }
      globalElementInspector.start({
        onSelect: (summary) => {
          setSelectedElement(summary);
        }
      });
    }
  };

  const handleClearSelectedElement = () => {
    setSelectedElement(null);
    globalElementInspector.clearHighlight();
  };

  const handleCopyLocator = (type, text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedLocator(type);
      setTimeout(() => {
        setCopiedLocator(null);
      }, 1800);
    } catch {
      // Fallback
      setCopiedLocator(type);
      setTimeout(() => setCopiedLocator(null), 1800);
    }
  };

  const handleSendAgentToElement = async () => {
    if (!selectedElement) return;
    setActiveTab("agent");

    const iframe = getActivePreviewerIframe();
    const doc = getSafeIframeDocument(iframe);
    let el = selectedElement.elementRef;
    if (!el && selectedElement.bestSelector && doc) {
      try {
        el = doc.querySelector(selectedElement.bestSelector);
      } catch {}
    }

    if (el) {
      await globalAgentCursor.moveTo(el, `Inspecting <${selectedElement.tagName}>`, { duration: 550 });
      await driverRef.current?.sleep(300);

      const thoughtText = `[User Dispatch] Guided agent cursor to inspected element: "${selectedElement.bestSelector}". Dimensions: ${selectedElement.dimensions?.width}×${selectedElement.dimensions?.height}px. Role: "${selectedElement.role}".`;
      setAgentThoughts((prev) => [
        ...prev,
        {
          id: `th_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          text: thoughtText,
          type: "action"
        }
      ]);
    }
  };

  const handleSimulateClick = async () => {
    if (!selectedElement || !driverRef.current) return;
    const iframe = getActivePreviewerIframe();
    const doc = getSafeIframeDocument(iframe);
    let el = selectedElement.elementRef;
    if (!el && selectedElement.bestSelector && doc) {
      try {
        el = doc.querySelector(selectedElement.bestSelector);
      } catch {}
    }

    if (el) {
      await globalAgentCursor.moveTo(el, `Clicking <${selectedElement.tagName}>`, { duration: 400 });
      await driverRef.current.click(el);
      setAgentThoughts((prev) => [
        ...prev,
        {
          id: `th_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          text: `[Interaction] Dispatched synthetic click to "${selectedElement.bestSelector}".`,
          type: "success"
        }
      ]);
    }
  };

  const handleSimulateSendKeys = async () => {
    if (!selectedElement || !driverRef.current || !inspectTypeInput) return;
    const iframe = getActivePreviewerIframe();
    const doc = getSafeIframeDocument(iframe);
    let el = selectedElement.elementRef;
    if (!el && selectedElement.bestSelector && doc) {
      try {
        el = doc.querySelector(selectedElement.bestSelector);
      } catch {}
    }

    if (el) {
      await globalAgentCursor.moveTo(el, `Typing text...`, { duration: 400 });
      await driverRef.current.sendKeys(el, inspectTypeInput);
      setAgentThoughts((prev) => [
        ...prev,
        {
          id: `th_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          text: `[Interaction] Typed "${inspectTypeInput}" into "${selectedElement.bestSelector}".`,
          type: "success"
        }
      ]);
      setInspectTypeInput("");
    }
  };

  const handleTargetForAgent = () => {
    if (!selectedElement) return;
    setActiveTab("agent");
    handleStartAgent(selectedElement);
  };

  const handleAddElementToCustomTest = () => {
    if (!selectedElement) return;
    const tag = selectedElement.tagName.toLowerCase();
    setCustomTestName(`Verify ${tag} (${selectedElement.id ? '#' + selectedElement.id : selectedElement.bestSelector})`);
    setCustomTestSelector(selectedElement.bestSelector);
    if (["input", "textarea"].includes(tag)) {
      setCustomTestAction("sendKeys");
      setCustomTestValue("Sample input");
    } else if (["button", "a"].includes(tag) || selectedElement.role === "button") {
      setCustomTestAction("click");
      setCustomTestValue("");
    } else {
      setCustomTestAction("assertVisible");
      setCustomTestValue("");
    }
    setActiveTab("tests");
    setShowCustomModal(true);
  };

  // --- Add Custom Test Case ---
  const handleAddCustomTest = () => {
    if (!customTestName.trim()) return;

    const newTest = {
      id: `custom_${Date.now()}`,
      name: customTestName,
      steps: [
        {
          type: "waitForElement",
          selector: customTestSelector,
          condition: "visible",
          desc: `Wait for element: ${customTestSelector}`
        },
        {
          type: customTestAction,
          selector: customTestSelector,
          value: customTestValue,
          expected: customTestValue,
          desc: `${customTestAction} on ${customTestSelector}`
        },
        {
          type: "takeSnapshot",
          desc: "Capture result snapshot"
        }
      ]
    };

    setTestSuites((prev) => {
      let customSuite = prev.find((s) => s.id === "suite_custom");
      if (!customSuite) {
        customSuite = {
          id: "suite_custom",
          name: "✨ Custom Selenium Tests",
          description: "User-defined interactive test cases and assertions.",
          tests: [newTest]
        };
        return [...prev, customSuite];
      } else {
        return prev.map((s) =>
          s.id === "suite_custom" ? { ...s, tests: [...s.tests, newTest] } : s
        );
      }
    });

    setSelectedTests((prev) => ({ ...prev, [newTest.id]: true }));
    setShowCustomModal(false);
    setCustomTestName("");
  };

  // --- Reports Export Handlers ---

  const handleDownloadHtml = () => {
    const html = generateHtmlReport(
      { ...runSummary, results: testResults },
      testSuites
    );
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selenium_test_report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport(
      { ...runSummary, results: testResults },
      testSuites
    );
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TEST_REPORT.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToWorkspace = async () => {
    const md = generateMarkdownReport(
      { ...runSummary, results: testResults },
      testSuites
    );
    if (createFile) {
      try {
        await createFile("TEST_REPORT.md");
        // Also open as tab in editor
        openFile?.({
          name: "TEST_REPORT.md",
          path: "TEST_REPORT.md",
          content: md,
          language: "markdown"
        });
        alert("Saved TEST_REPORT.md directly to workspace root!");
      } catch (err) {
        handleDownloadMarkdown();
      }
    } else {
      handleDownloadMarkdown();
    }
  };

  return (
    <div className={`selenium-runner-root ${showSplitPreview ? "has-split" : ""}`}>
      <div className="selenium-runner-container">
      {/* Target Previewer Connection Header */}
      <div className="selenium-target-bar">
        <div className="target-indicator-group">
          <span
            className={`connection-dot ${isPreviewerConnected ? "connected" : "disconnected"}`}
          />
          <div className="target-text">
            <span className="target-state">
              {isPreviewerConnected ? "BUILTIN PREVIEWER LINKED" : "PREVIEWER DETACHED"}
            </span>
            <span className="target-url" title={previewerUrl}>
              {isPreviewerConnected
                ? previewerTitle || previewerUrl
                : "No active preview iframe detected"}
            </span>
          </div>
        </div>

        <div className="target-actions-group">
          <button
            className={`selenium-inspect-btn ${isInspectActive ? "active" : ""}`}
            onClick={handleToggleInspect}
            title={isInspectActive ? "Exit Element Inspector (Esc)" : "Inspect & Select Element in Preview (Ctrl+Shift+C)"}
          >
            <FaCrosshairs className={isInspectActive ? "spin-pulse" : ""} /> {isInspectActive ? "Inspecting..." : "Inspect"}
          </button>

          {!isPreviewerConnected ? (
            <button
              className="selenium-launch-btn"
              onClick={handleLaunchPreviewer}
              title="Launch previewer tab in editor"
            >
              <FaExternalLinkAlt /> Launch Previewer
            </button>
          ) : (
            <button
              className="selenium-bridge-btn"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("hyperion:enable-automation-bridge"));
                handleGenerateTests();
              }}
              title="Activate / Sync Same-Origin Automation Bridge for live DOM access"
            >
              ⚡ Sync Bridge
            </button>
          )}

          <button
            className={`selenium-split-toggle-btn ${showSplitPreview ? "active" : ""}`}
            onClick={() => setShowSplitPreview(!showSplitPreview)}
            title="Toggle Side-by-Side Live Preview Pane"
          >
            <FaDesktop /> {showSplitPreview ? "Hide Preview" : "Split Preview"}
          </button>
        </div>
      </div>

      {/* Chromium DevTools-Style Inspect Active Banner */}
      {isInspectActive && (
        <div className="inspect-active-banner">
          <div className="inspect-banner-info">
            <FaCrosshairs className="inspect-banner-crosshair" />
            <span>
              <strong>Inspect Mode Active:</strong> Hover over any element in the preview to highlight. Click to select. Press <kbd>Esc</kbd> to exit.
            </span>
          </div>
          <button
            className="inspect-banner-cancel-btn"
            onClick={() => globalElementInspector.stop(true)}
            title="Exit inspection mode without selecting"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Chromium-Style Selected Element Inspector Card */}
      {selectedElement && (
        <div className="selected-element-card">
          <div className="selected-element-header">
            <div className="element-badges">
              <span className="badge tag-badge">&lt;{selectedElement.tagName}&gt;</span>
              {selectedElement.id && (
                <span className="badge id-badge" title={`ID: ${selectedElement.id}`}>
                  #{selectedElement.id}
                </span>
              )}
              {selectedElement.className && (
                <span className="badge class-badge" title={`Classes: ${selectedElement.className}`}>
                  .{selectedElement.className.trim().split(/\s+/)[0]}
                </span>
              )}
              {selectedElement.dimensions && (
                <span className="badge dim-badge">
                  {selectedElement.dimensions.width} × {selectedElement.dimensions.height} px
                </span>
              )}
              {selectedElement.role && (
                <span className="badge role-badge" title="ARIA Accessibility Role">
                  role: <strong>{selectedElement.role}</strong>
                </span>
              )}
            </div>

            <div className="element-card-actions">
              <button
                className="card-action-btn primary"
                onClick={handleTargetForAgent}
                title="Focus Autonomous QA Agent on this component"
              >
                <FaBullseye /> Target for Agent
              </button>
              <button
                className="card-action-btn close"
                onClick={handleClearSelectedElement}
                title="Deselect inspected element"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Quick Action Simulation Bar */}
          <div className="element-quick-sim-bar">
            <button
              className="sim-action-btn glide"
              onClick={handleSendAgentToElement}
              title="Glide AI cursor to element and stream reasoning thought"
            >
              <FaRobot /> Send Agent Here
            </button>

            <button
              className="sim-action-btn click"
              onClick={handleSimulateClick}
              title="Dispatch live synthetic click to this element"
            >
              <FaMousePointer /> Click
            </button>

            <div className="sim-type-group">
              <input
                type="text"
                className="sim-type-input"
                value={inspectTypeInput}
                onChange={(e) => setInspectTypeInput(e.target.value)}
                placeholder="Type to send keys..."
                onKeyDown={(e) => e.key === "Enter" && handleSimulateSendKeys()}
              />
              <button
                className="sim-action-btn type"
                onClick={handleSimulateSendKeys}
                disabled={!inspectTypeInput.trim()}
                title="Dispatch keystrokes into this element"
              >
                <FaKeyboard /> Send
              </button>
            </div>

            <button
              className="sim-action-btn add-step"
              onClick={handleAddElementToCustomTest}
              title="Pre-fill custom test step with this element"
            >
              <FaPlus /> Add Test Step
            </button>
          </div>

          {/* Copyable Locators Table */}
          <div className="element-locators-table">
            <div className="locator-row">
              <span className="locator-label">CSS:</span>
              <code className="locator-code" title={selectedElement.bestSelector}>
                {selectedElement.bestSelector}
              </code>
              <button
                className="copy-locator-btn"
                onClick={() => handleCopyLocator("css", selectedElement.bestSelector)}
                title="Copy CSS Selector"
              >
                {copiedLocator === "css" ? <FaCheck className="copied" /> : <FaCopy />}
              </button>
            </div>

            <div className="locator-row">
              <span className="locator-label">XPath:</span>
              <code className="locator-code" title={selectedElement.xpath}>
                {selectedElement.xpath}
              </code>
              <button
                className="copy-locator-btn"
                onClick={() => handleCopyLocator("xpath", selectedElement.xpath)}
                title="Copy XPath Expression"
              >
                {copiedLocator === "xpath" ? <FaCheck className="copied" /> : <FaCopy />}
              </button>
            </div>

            <div className="locator-row">
              <span className="locator-label">Testing Library:</span>
              <code className="locator-code" title={selectedElement.testingLibrary}>
                {selectedElement.testingLibrary}
              </code>
              <button
                className="copy-locator-btn"
                onClick={() => handleCopyLocator("testingLibrary", selectedElement.testingLibrary)}
                title="Copy Testing Library Locator"
              >
                {copiedLocator === "testingLibrary" ? <FaCheck className="copied" /> : <FaCopy />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="selenium-nav-tabs">
        <button
          className={`selenium-tab-btn ${activeTab === "tests" ? "active" : ""}`}
          onClick={() => setActiveTab("tests")}
        >
          <VscBeaker /> Tests ({testSuites.reduce((acc, s) => acc + s.tests.length, 0)})
        </button>
        <button
          className={`selenium-tab-btn ${activeTab === "agent" ? "active" : ""}`}
          onClick={() => setActiveTab("agent")}
        >
          <FaRobot /> Agentic QA {isAgentRunning && <FaSpinner className="spin-icon" />}
        </button>
        <button
          className={`selenium-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <VscReport /> Reports & Logs
        </button>
      </div>

      {/* TAB 1: TEST AUTOMATION */}
      {activeTab === "tests" && (
        <div className="selenium-tab-content">
          {/* Action Toolbar */}
          <div className="selenium-toolbar">
            <div className="btn-group">
              <button
                className="toolbar-btn primary"
                onClick={() => handleRunAll(false)}
                disabled={isRunning}
                title="Run All Test Suites"
              >
                {isRunning ? <FaSpinner className="spin-icon" /> : <FaPlay />} Run All
              </button>

              <button
                className="toolbar-btn secondary"
                onClick={() => handleRunAll(true)}
                disabled={isRunning}
                title="Run Selected Tests"
              >
                <FaListUl /> Run Selected
              </button>

              {isRunning && (
                <>
                  <button
                    className="toolbar-btn control"
                    onClick={handlePauseResume}
                    title={isPaused ? "Resume Execution" : "Pause Execution"}
                  >
                    {isPaused ? <FaPlay /> : <FaPause />}
                  </button>
                  <button
                    className="toolbar-btn stop"
                    onClick={handleStopRun}
                    title="Stop Execution"
                  >
                    <FaStop />
                  </button>
                </>
              )}
            </div>

            <div className="toolbar-aux">
              <select
                className="speed-selector"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                title="Execution delay between steps"
              >
                <option value="slow">Slow (1200ms)</option>
                <option value="normal">Normal (450ms)</option>
                <option value="fast">Fast (120ms)</option>
                <option value="turbo">Turbo (0ms)</option>
              </select>

              <button
                className="toolbar-btn icon-only"
                onClick={handleGenerateTests}
                title="Rescan Previewer DOM and Regenerate Tests"
              >
                <FaSync />
              </button>

              <button
                className="toolbar-btn icon-only"
                onClick={() => setShowCustomModal(true)}
                title="Add Custom Test Case"
              >
                <FaPlus />
              </button>
            </div>
          </div>

          {/* Test Suites Tree */}
          <div className="suites-list">
            {testSuites.map((suite) => {
              const isExpanded = expandedSuites[suite.id];
              const isSuiteAllSelected = suite.tests.every(
                (t) => selectedTests[t.id]
              );

              return (
                <div className="suite-item" key={suite.id}>
                  <div className="suite-header">
                    <span
                      className="suite-chevron"
                      onClick={() => toggleExpandSuite(suite.id)}
                    >
                      {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                    </span>

                    <input
                      type="checkbox"
                      className="suite-checkbox"
                      checked={isSuiteAllSelected}
                      onChange={() => toggleSelectSuite(suite)}
                    />

                    <span
                      className="suite-name"
                      onClick={() => toggleExpandSuite(suite.id)}
                    >
                      {suite.name}
                    </span>

                    <span className="suite-count">({suite.tests.length})</span>
                  </div>

                  {isExpanded && (
                    <div className="suite-tests-list">
                      {suite.tests.map((test) => {
                        const isSelected = !!selectedTests[test.id];
                        const testResult = testResults.find(
                          (r) => r.testId === test.id
                        );
                        const isCurrentRunning = activeRunningTestId === test.id;
                        const isTestExpanded = expandedTests[test.id];

                        return (
                          <div
                            className={`test-item ${isCurrentRunning ? "running" : ""} ${testResult?.status || ""}`}
                            key={test.id}
                          >
                            <div className="test-header">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectTest(test.id)}
                              />

                              <span
                                className="test-status-icon"
                                onClick={() => toggleExpandTest(test.id)}
                              >
                                {isCurrentRunning ? (
                                  <FaSpinner className="spin-icon running-color" />
                                ) : testResult?.status === "passed" ? (
                                  <FaCheckCircle className="pass-color" />
                                ) : testResult?.status === "failed" ? (
                                  <FaTimesCircle className="fail-color" />
                                ) : (
                                  <span className="pending-dot" />
                                )}
                              </span>

                              <span
                                className="test-name"
                                onClick={() => toggleExpandTest(test.id)}
                              >
                                {test.name}
                              </span>

                              {testResult?.durationMs !== undefined && (
                                <span className="test-duration">
                                  {testResult.durationMs}ms
                                </span>
                              )}
                            </div>

                            {/* Expanded Test Steps */}
                            {isTestExpanded && (
                              <div className="test-steps-container">
                                {test.steps.map((step, idx) => {
                                  const stepResult = testResult?.steps?.[idx];
                                  return (
                                    <div
                                      className={`step-row ${stepResult?.status || ""}`}
                                      key={idx}
                                    >
                                      <span className="step-idx">{idx + 1}.</span>
                                      <span className="step-type">[{step.type}]</span>
                                      <span className="step-desc">
                                        {step.desc || step.selector}
                                      </span>
                                      {stepResult?.durationMs !== undefined && (
                                        <span className="step-ms">
                                          {stepResult.durationMs}ms
                                        </span>
                                      )}
                                      {stepResult?.error && (
                                        <div className="step-error-msg">
                                          {stepResult.error}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AGENTIC TESTING */}
      {activeTab === "agent" && (
        <div className="selenium-tab-content agent-panel">
          {/* Agent Control Header */}
          <div className="agent-hero-card">
            <div className="agent-hero-info">
              <FaRobot className="agent-avatar" />
              <div>
                <h4 className="agent-title">Autonomous QA Agent</h4>
                <p className="agent-desc">
                  Autonomous exploratory tester that dynamically inspects DOM,
                  formulates testing goals, discovers UI defects, and validates accessibility.
                </p>
              </div>
            </div>

            <div className="agent-actions">
              {!isAgentRunning ? (
                <button
                  className="agent-start-btn"
                  onClick={handleStartAgent}
                >
                  <FaPlay /> Start Agentic Test
                </button>
              ) : (
                <button className="agent-stop-btn" onClick={handleStopAgent}>
                  <FaStop /> Abort Agent
                </button>
              )}
            </div>
          </div>

          {/* Active Goal & Progress Bar */}
          <div className="agent-goal-card">
            <div className="agent-goal-header">
              <span className="goal-label">CURRENT GOAL:</span>
              <span className="goal-text">{agentGoal}</span>
              <span className="goal-pct">{agentProgress}%</span>
            </div>
            <div className="agent-progress-track">
              <div
                className="agent-progress-fill"
                style={{ width: `${agentProgress}%` }}
              />
            </div>
          </div>

          {/* Health Score Card if complete */}
          {agentHealthScore !== null && (
            <div className="health-score-card">
              <div className="score-circle">
                <span className="score-number">{agentHealthScore}</span>
                <span className="score-total">/100</span>
              </div>
              <div className="score-summary">
                <h4 className="score-title">
                  {agentHealthScore >= 90
                    ? "Application Status: Excellent"
                    : agentHealthScore >= 70
                    ? "Application Status: Moderate"
                    : "Application Status: Attention Needed"}
                </h4>
                <p className="score-stats">
                  {agentFindings.length} autonomous findings discovered across{" "}
                  {agentThoughts.length} execution observations.
                </p>
              </div>
            </div>
          )}

          {/* Agent Thoughts Stream */}
          <div className="agent-stream-section">
            <div className="section-title">
              <FaTerminal /> Live Reasoning Stream
            </div>
            <div className="thoughts-terminal">
              {agentThoughts.length === 0 ? (
                <div className="thoughts-empty">
                  Agent is idle. Click "Start Agentic Test" to begin exploratory testing.
                </div>
              ) : (
                agentThoughts.map((th) => (
                  <div className={`thought-line ${th.type}`} key={th.id}>
                    <span className="thought-time">[{th.timestamp}]</span>
                    <span className="thought-text">{th.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Agent Discovered Findings */}
          <div className="agent-findings-section">
            <div className="section-title">
              <FaBug /> Discovered Findings & Audit ({agentFindings.length})
            </div>
            <div className="findings-list">
              {agentFindings.length === 0 ? (
                <div className="findings-empty">No flaws or issues discovered yet.</div>
              ) : (
                agentFindings.map((f) => (
                  <div className={`finding-card ${f.severity}`} key={f.id}>
                    <div className="finding-top">
                      <span className={`finding-badge ${f.severity}`}>
                        {f.severity.toUpperCase()}
                      </span>
                      <span className="finding-title">{f.title}</span>
                    </div>
                    <p className="finding-desc">{f.description}</p>
                    {f.recommendation && (
                      <div className="finding-rec">
                        <strong>Fix:</strong> {f.recommendation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS & LOGS */}
      {activeTab === "reports" && (
        <div className="selenium-tab-content reports-panel">
          {/* Executive Summary Metrics */}
          <div className="reports-metrics-row">
            <div className="report-metric-card">
              <span className="metric-val">{runSummary.total}</span>
              <span className="metric-lbl">Total Tests</span>
            </div>
            <div className="report-metric-card pass">
              <span className="metric-val">{runSummary.passed}</span>
              <span className="metric-lbl">Passed</span>
            </div>
            <div className="report-metric-card fail">
              <span className="metric-val">{runSummary.failed}</span>
              <span className="metric-lbl">Failed</span>
            </div>
            <div className="report-metric-card time">
              <span className="metric-val">
                {(runSummary.durationMs / 1000).toFixed(1)}s
              </span>
              <span className="metric-lbl">Duration</span>
            </div>
          </div>

          {/* Export Action Controls */}
          <div className="reports-actions-box">
            <button
              className="export-btn html"
              onClick={handleDownloadHtml}
              title="Download standalone HTML report with interactive log viewer"
            >
              <FaFileDownload /> Export HTML Report
            </button>

            <button
              className="export-btn md"
              onClick={handleDownloadMarkdown}
              title="Download TEST_REPORT.md for GitHub"
            >
              <FaFileDownload /> Export Markdown
            </button>

            <button
              className="export-btn save"
              onClick={handleSaveToWorkspace}
              title="Save TEST_REPORT.md directly into project root workspace"
            >
              <FaSave /> Save to Workspace
            </button>
          </div>

          {/* Results Breakdown */}
          <div className="results-breakdown-section">
            <div className="section-title">Test Results Breakdown</div>
            {testResults.length === 0 ? (
              <div className="results-empty">
                No test results recorded yet. Run tests from the "Tests" tab to compile a report.
              </div>
            ) : (
              <div className="results-list">
                {testResults.map((res) => (
                  <div
                    className={`result-item-card ${res.status}`}
                    key={res.testId}
                  >
                    <div className="result-item-header">
                      <span className="result-title">{res.testName}</span>
                      <span className={`result-tag ${res.status}`}>
                        {res.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="result-item-meta">
                      Duration: {res.durationMs}ms | Steps:{" "}
                      {res.steps.filter((s) => s.status === "passed").length} /{" "}
                      {res.steps.length} passed
                    </div>
                    {res.error && (
                      <div className="result-error-box">
                        <strong>Error:</strong> {res.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Test Creation Modal */}
      {showCustomModal && (
        <div className="modal-backdrop">
          <div className="custom-test-modal">
            <h4 className="modal-title">Create Custom Selenium Test</h4>
            <div className="modal-form">
              <label>Test Case Name</label>
              <input
                type="text"
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                placeholder="e.g. Verify Login Button Click"
              />

              <label>Target CSS Selector / By</label>
              <input
                type="text"
                value={customTestSelector}
                onChange={(e) => setCustomTestSelector(e.target.value)}
                placeholder="e.g. #login-btn or button.primary"
              />

              <label>Action</label>
              <select
                value={customTestAction}
                onChange={(e) => setCustomTestAction(e.target.value)}
              >
                <option value="click">click</option>
                <option value="sendKeys">sendKeys (type text)</option>
                <option value="clear">clear</option>
                <option value="assertText">assertText</option>
                <option value="assertVisible">assertVisible</option>
              </select>

              {(customTestAction === "sendKeys" ||
                customTestAction === "assertText") && (
                <>
                  <label>Value / Expected Text</label>
                  <input
                    type="text"
                    value={customTestValue}
                    onChange={(e) => setCustomTestValue(e.target.value)}
                    placeholder="Value to type or expect"
                  />
                </>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-submit-btn"
                onClick={handleAddCustomTest}
                disabled={!customTestName.trim()}
              >
                Add Test
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      {showSplitPreview && (
        <div className="selenium-runner-preview-pane">
          <LiveBrowser
            initialUrl={
              (previewerUrl && previewerUrl !== "about:blank")
                ? previewerUrl
                : ((window.__hyperion_previewer_url__ && window.__hyperion_previewer_url__ !== "about:blank")
                    ? window.__hyperion_previewer_url__
                    : "http://localhost:5174")
            }
            title="Live Automation Target Preview"
            onClose={() => setShowSplitPreview(false)}
          />
        </div>
      )}
    </div>
  );
}

