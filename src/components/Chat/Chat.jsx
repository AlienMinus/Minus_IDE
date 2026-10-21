import "./Chat.css";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaPaperPlane,
  FaUserCircle,
  FaEdit,
  FaTrashAlt,
  FaCopy,
  FaRedo,
  FaShieldAlt,
  FaKey,
  FaBug,
  FaSpinner,
  FaFileCode,
  FaPaperclip,
  FaTimes,
  FaFolderOpen
} from "react-icons/fa";
import {
  sendChatMessage,
  getAiStatus,
  getCodebaseFiles,
  scanCodebaseFile
} from "../../services/aiService";
import { getStoredWorkspaceState } from "../../services/workspacePersistence";
import useEditor from "../../hooks/useEditor";

const STORAGE_KEY = "hyperion_cypher_chat_history";
const MODEL_STORAGE_KEY = "hyperion_cypher_model";

const DEFAULT_MESSAGE = {
  id: 1,
  sender: "assistant",
  text: "**Hello! I am Cypher**, your AI Code Security Analyst and programming assistant.\n\nI can analyze your code for **OWASP vulnerabilities**, **SQL/Command Injection**, **Cross-Site Scripting (XSS)**, **leaked API keys**, and provide secure remediations.\n\nHow can I help you secure your workspace today?",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
};

function Chat() {
  const { activeFile } = useEditor();
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Failed to read chat history from localStorage:", err);
    }
    return [DEFAULT_MESSAGE];
  });

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const cancelScanRef = useRef(false);
  const [attachedFile, setAttachedFile] = useState(null);

  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      const storedSettings = localStorage.getItem("hyperion_settings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed["ai.model"]) return parsed["ai.model"];
      }
      return localStorage.getItem(MODEL_STORAGE_KEY) || "meta-llama/Llama-3.1-8B-Instruct";
    } catch {
      return "meta-llama/Llama-3.1-8B-Instruct";
    }
  });

  const [aiStatus, setAiStatus] = useState(null);

  const [typedText, setTypedText] = useState(() => {
    const initial = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((msg) => {
            if (msg.sender === "assistant" && msg.text) {
              initial[msg.id] = msg.text;
            }
          });
          return initial;
        }
      }
    } catch {}
    initial[DEFAULT_MESSAGE.id] = DEFAULT_MESSAGE.text;
    return initial;
  });

  // Preserve messages in localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn("Failed to persist chat history to localStorage:", err);
    }
  }, [messages]);

  const handleModelChange = (newModel) => {
    setSelectedModel(newModel);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, newModel);
      const storedSettings = localStorage.getItem("hyperion_settings");
      const current = storedSettings ? JSON.parse(storedSettings) : {};
      current["ai.model"] = newModel;
      localStorage.setItem("hyperion_settings", JSON.stringify(current));
      window.dispatchEvent(new CustomEvent("hyperion:settings-changed", { detail: { settings: current } }));
    } catch {}
  };

  // Keep chat model in sync if changed from Settings page
  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      const model = e.detail?.settings?.["ai.model"];
      if (model && model !== selectedModel) {
        setSelectedModel(model);
        try {
          localStorage.setItem(MODEL_STORAGE_KEY, model);
        } catch {}
      }
    };
    window.addEventListener("hyperion:settings-changed", handleSettingsUpdate);
    return () => window.removeEventListener("hyperion:settings-changed", handleSettingsUpdate);
  }, [selectedModel]);

  const handleClearHistory = () => {
    const reset = [{
      id: Date.now(),
      sender: "assistant",
      text: "**Hello! I am Cypher**, your AI Code Security Analyst and programming assistant.\n\nChat history cleared. How can I help you secure your workspace today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }];
    setMessages(reset);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    } catch {}
    setTypedText({ [reset[0].id]: reset[0].text });
  };

  const typingTimers = useRef({});
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check backend AI status on mount
  useEffect(() => {
    getAiStatus().then((status) => {
      setAiStatus(status);
      const stored = localStorage.getItem("hyperion_settings");
      const hasStoredModel = stored && JSON.parse(stored)["ai.model"];
      if (!hasStoredModel && !localStorage.getItem(MODEL_STORAGE_KEY) && status?.defaultModel) {
        setSelectedModel(status.defaultModel);
      }
    });
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  };

  // Listen for context-menu "Add File to Chat" event
  useEffect(() => {
    const handleAddToChat = (e) => {
      const targetFile = e.detail?.file;
      if (targetFile) {
        setAttachedFile({
          name: targetFile.name,
          language: targetFile.language || "javascript",
          content: targetFile.content || "",
          lineCount: (targetFile.content || "").split("\n").length
        });
        if (textareaRef.current) textareaRef.current.focus();
      }
    };
    window.addEventListener("hyperion:add-to-chat", handleAddToChat);
    return () => window.removeEventListener("hyperion:add-to-chat", handleAddToChat);
  }, []);

  const startTyping = (messageItem) => {
    const { id, text } = messageItem;
    if (typingTimers.current[id]) {
      clearInterval(typingTimers.current[id]);
    }
    setTypedText((prev) => ({ ...prev, [id]: "" }));
    let index = 0;
    typingTimers.current[id] = setInterval(() => {
      index += 3;
      setTypedText((prev) => ({ ...prev, [id]: text.slice(0, index) }));
      if (index >= text.length) {
        clearInterval(typingTimers.current[id]);
        delete typingTimers.current[id];
      }
    }, 15);
  };

  const handleSend = async (customPrompt = null, fragment = null) => {
    const textToSend = typeof customPrompt === "string" ? customPrompt : message;
    const fileFragmentToSend = fragment || attachedFile;

    if (!textToSend.trim() && !fileFragmentToSend) return;
    if (isLoading) return;

    if (editingMessageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                text: textToSend.trim(),
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            : msg
        )
      );
      setEditingMessageId(null);
      setMessage("");
      return;
    }

    const trimmedInput = (textToSend || message).trim();
    if (!fileFragmentToSend && /^(scan codebase|full codebase scan|codebase scan|scan entire codebase|full scan of codebase)$/i.test(trimmedInput)) {
      handleFullCodebaseScan();
      return;
    }

    const displayText = textToSend.trim() || (fileFragmentToSend ? `Analyze security for \`${fileFragmentToSend.name}\`` : "");

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: displayText,
      fileFragment: fileFragmentToSend ? {
        name: fileFragmentToSend.name,
        language: fileFragmentToSend.language || "code",
        lineCount: fileFragmentToSend.lineCount || (fileFragmentToSend.content || "").split("\n").length
      } : null,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setMessage("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "54px";
    }

    // Call Cypher AI Backend with the attached file fragment
    setIsLoading(true);
    try {
      const response = await sendChatMessage(updatedHistory, selectedModel, "security", fileFragmentToSend);
      const assistantText = response.message || response.error || "No response received from Cypher.";

      const assistantMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: assistantText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: `**Cypher Security Warning:** ${err.message || "Failed to process request."}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullCodebaseScan = async () => {
    if (isLoading || scanProgress) return;

    cancelScanRef.current = false;
    const cachedState = getStoredWorkspaceState();
    const workspacePath = cachedState?.folderPath || null;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: "🔍 Run full security scan across codebase files (one-by-one, excluding .gitignore)",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. Fetch eligible codebase files respecting .gitignore
      const filesRes = await getCodebaseFiles(workspacePath);
      const filesToScan = filesRes.files || [];

      if (filesToScan.length === 0) {
        const noFilesMsg = {
          id: Date.now() + 1,
          sender: "assistant",
          text: `## 🛡️ Cypher Codebase Scan\n\nNo eligible source files were found to scan in the current workspace.\n\nAll detected files may have been ignored based on rules in \`.gitignore\` (e.g. \`node_modules\`, \`dist\`, \`.env\`).`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, noFilesMsg]);
        setIsLoading(false);
        return;
      }

      setScanProgress({
        current: 0,
        total: filesToScan.length,
        currentFile: filesToScan[0].path,
        critical: 0,
        high: 0,
        medium: 0,
        clean: 0
      });

      const allFindings = [];
      let criticalTotal = 0;
      let highTotal = 0;
      let mediumTotal = 0;
      let lowTotal = 0;
      let cleanFilesCount = 0;
      let vulnerableFilesCount = 0;

      // 2. Scan files ONE BY ONE
      for (let i = 0; i < filesToScan.length; i++) {
        if (cancelScanRef.current) break;

        const fileObj = filesToScan[i];
        setScanProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentFile: fileObj.path
        }));

        try {
          const scanRes = await scanCodebaseFile(fileObj.path, workspacePath);
          const findings = scanRes.findings || [];

          if (findings.length > 0) {
            vulnerableFilesCount++;
            findings.forEach((f) => {
              allFindings.push({
                file: fileObj.path,
                line: f.line,
                name: f.name,
                cwe: f.cwe,
                severity: f.severity,
                snippet: f.codeSnippet,
                description: f.description,
                remediation: f.remediation
              });
              if (f.severity === 'CRITICAL') criticalTotal++;
              else if (f.severity === 'HIGH') highTotal++;
              else if (f.severity === 'MEDIUM') mediumTotal++;
              else lowTotal++;
            });
          } else {
            cleanFilesCount++;
          }

          setScanProgress((prev) => ({
            ...prev,
            current: i + 1,
            critical: criticalTotal,
            high: highTotal,
            medium: mediumTotal,
            clean: cleanFilesCount
          }));
        } catch (err) {
          console.warn(`Failed to scan file ${fileObj.path}:`, err);
        }

        // Small yield to allow UI update and smooth animation
        await new Promise((r) => setTimeout(r, 60));
      }

      setScanProgress(null);

      // 3. Compile Consolidated Codebase Audit Report
      const totalScanned = cleanFilesCount + vulnerableFilesCount;

      let riskLevelBadge = '🟢 **SECURE / CLEAN** (High Confidence)';
      if (criticalTotal > 0) riskLevelBadge = '🔴 **CRITICAL RISK** (Immediate Fixes Required)';
      else if (highTotal > 0) riskLevelBadge = '🟠 **HIGH RISK** (Vulnerabilities Detected)';
      else if (mediumTotal > 0) riskLevelBadge = '🟡 **MEDIUM RISK** (Hardening Recommended)';

      let reportMarkdown = `## 🛡️ Cypher Codebase Security Audit Report\n\n`;
      reportMarkdown += `**Scan Target:** Entire Codebase (${totalScanned} files evaluated one-by-one)\n`;
      reportMarkdown += `**Overall Security Status:** ${riskLevelBadge}\n\n`;

      reportMarkdown += `### 📊 Scan Metrics & Coverage\n`;
      reportMarkdown += `- **Total Files Scanned:** ${totalScanned} source files\n`;
      reportMarkdown += `- **Clean Files:** ${cleanFilesCount} ✅\n`;
      reportMarkdown += `- **Vulnerable Files:** ${vulnerableFilesCount} ${vulnerableFilesCount > 0 ? '⚠️' : '✅'}\n`;
      reportMarkdown += `- **Total Security Findings:** ${allFindings.length}\n`;
      reportMarkdown += `  - 🔴 **Critical:** ${criticalTotal}\n`;
      reportMarkdown += `  - 🟠 **High:** ${highTotal}\n`;
      reportMarkdown += `  - 🟡 **Medium:** ${mediumTotal}\n`;
      reportMarkdown += `  - 🔵 **Low:** ${lowTotal}\n\n`;

      reportMarkdown += `### 📁 Exclusions Applied (.gitignore)\n`;
      reportMarkdown += `Strictly skipped all matching directories & files:\n`;
      reportMarkdown += `- \`node_modules/\`, \`dist/\`, \`dist-ssr/\`, \`.git/\`, \`.vscode/\`\n`;
      reportMarkdown += `- Environment files (\`.env*\` except \`.env.example\`)\n`;
      reportMarkdown += `- Log files (\`*.log\`, \`logs/\`) and compiled binaries / media\n\n`;

      if (allFindings.length > 0) {
        reportMarkdown += `### 🚨 Identified Security Vulnerabilities\n\n`;
        reportMarkdown += `| Severity | File | Line | Vulnerability / CWE | Remediation |\n`;
        reportMarkdown += `|:---|:---|:---:|:---|:---|\n`;

        const severityRank = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
        const sortedFindings = [...allFindings].sort(
          (a, b) => (severityRank[a.severity] || 5) - (severityRank[b.severity] || 5)
        );

        sortedFindings.slice(0, 25).forEach((f) => {
          const sevIcon =
            f.severity === 'CRITICAL'
              ? '🔴 CRITICAL'
              : f.severity === 'HIGH'
              ? '🟠 HIGH'
              : f.severity === 'MEDIUM'
              ? '🟡 MEDIUM'
              : '🔵 LOW';
          const fileLink = `\`${f.file}\``;
          const remBrief =
            (f.remediation || '').replace(/\|/g, '\\|').slice(0, 85) +
            (f.remediation?.length > 85 ? '...' : '');
          reportMarkdown += `| ${sevIcon} | ${fileLink} | \`${f.line}\` | **${f.name}** (${f.cwe}) | ${remBrief} |\n`;
        });

        if (sortedFindings.length > 25) {
          reportMarkdown += `\n*... and ${sortedFindings.length - 25} more findings.*\n`;
        }

        reportMarkdown += `\n### 🔧 Priority Next Steps\n`;
        if (criticalTotal > 0) {
          reportMarkdown += `1. **Rotate Leaked Credentials / Secrets immediately** and move all keys to environment variables.\n`;
        }
        if (highTotal > 0) {
          reportMarkdown += `2. **Sanitize Inputs & Avoid Dynamic Execution**: Replace dynamic queries/commands with parameterized alternatives.\n`;
        }
        reportMarkdown += `3. You can ask Cypher to refactor any specific vulnerable file by typing its path or using **"Scan Active File"**!`;
      } else {
        reportMarkdown += `### ✅ Clean Audit Result\n`;
        reportMarkdown += `No hardcoded secrets, injection vectors, or OWASP Top 10 vulnerabilities were detected across the analyzed codebase files!`;
      }

      const assistantMsg = {
        id: Date.now() + 1,
        sender: "assistant",
        text: reportMarkdown,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = {
        id: Date.now() + 1,
        sender: "assistant",
        text: `**Cypher Security Error:** Failed to complete codebase scan: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setScanProgress(null);
    }
  };

  const handleScanActiveFile = () => {
    if (!activeFile) {
      handleSend("Please provide a comprehensive code security checklist and guide for securing files in this workspace.");
      return;
    }
    const fragment = {
      name: activeFile.name,
      language: activeFile.language || "javascript",
      content: activeFile.content || "",
      lineCount: (activeFile.content || "").split("\n").length
    };
    handleSend("Scan active file for code security vulnerabilities", fragment);
  };

  const handleOwaspAudit = () => {
    if (activeFile && activeFile.content) {
      const fragment = {
        name: activeFile.name,
        language: activeFile.language || "javascript",
        content: activeFile.content,
        lineCount: activeFile.content.split("\n").length
      };
      handleSend("Perform an OWASP Top 10 security audit on active file", fragment);
    } else {
      handleSend("Perform an OWASP Top 10 security audit. What are the key application vulnerabilities and how should we mitigate them?");
    }
  };

  const handleSecretsCheck = () => {
    if (activeFile && activeFile.content) {
      const fragment = {
        name: activeFile.name,
        language: activeFile.language || "javascript",
        content: activeFile.content,
        lineCount: activeFile.content.split("\n").length
      };
      handleSend("Scan active file for leaked secrets, hardcoded passwords, and API keys", fragment);
    } else {
      handleSend("Scan code for leaked secrets, hardcoded passwords, AWS credentials, and API keys. Explain detection patterns and remediation.");
    }
  };

  const handleEditMessage = (id, text) => {
    setEditingMessageId(id);
    setMessage(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleDeleteMessage = (id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
    if (editingMessageId === id) {
      setEditingMessageId(null);
      setMessage("");
    }
  };

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  };

  const handleRegenerateResponse = async (id) => {
    const idx = messages.findIndex((m) => m.id === id);
    if (idx <= 0) return;
    const historyUpToUser = messages.slice(0, idx);

    setIsLoading(true);
    try {
      const response = await sendChatMessage(historyUpToUser, selectedModel, "security");
      const updatedText = response.message || "No response received.";

      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, text: updatedText } : msg))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.sender === "assistant" && typedText[msg.id] === undefined) {
        startTyping(msg);
      }
    });
    return () => {
      Object.values(typingTimers.current).forEach(clearInterval);
    };
  }, [messages]);

  return (
    <div className="chat-container">
      {/* Cypher Header */}
      <div className="chat-header">
        <div className="chat-title-group">
          <div className="cypher-header-avatar-container">
            <img src="/cypher.png" alt="Cypher" className="cypher-header-avatar" />
          </div>
          <div>
            <div className="cypher-name-badge">
              <h3>Cypher</h3>
              <span className="cypher-badge">AI Security</span>
            </div>
            <p>Hugging Face AI Code Security Analyst</p>
          </div>
        </div>

        <div className="chat-status-group">
          <button
            type="button"
            className="chat-clear-history-btn"
            onClick={handleClearHistory}
            title="Clear Chat History"
          >
            <FaTrashAlt />
          </button>
          <span className="chat-status online">
            <span className="status-dot"></span> Online
          </span>
        </div>
      </div>

      {/* Model Selection Bar */}
      <div className="chat-model-bar">
        <span className="model-label">HF Model:</span>
        <select
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className="chat-model-select"
        >
          <option value="meta-llama/Llama-3.1-8B-Instruct">Meta LLaMA 3.1 8B Instruct</option>
          <option value="Qwen/Qwen2.5-Coder-32B-Instruct">Qwen 2.5 Coder 32B</option>
          <option value="deepseek-ai/DeepSeek-R1">DeepSeek R1</option>
        </select>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`chat-message ${item.sender === "user" ? "user" : "assistant"}`}
          >
            <div className={`chat-bubble ${item.sender}`}>
              {item.sender === "assistant" && (
                <div className="cypher-bubble-avatar-wrapper">
                  <img src="/cypher.png" alt="Cypher" className="cypher-bubble-avatar" />
                </div>
              )}

              <div className="chat-message-body">
                {item.fileFragment && (
                  <div className="chat-file-fragment-card">
                    <div className="fragment-card-icon-wrap">
                      <FaFileCode className="fragment-card-icon" />
                    </div>
                    <div className="fragment-card-info">
                      <span className="fragment-card-name">{item.fileFragment.name}</span>
                      <span className="fragment-card-meta">
                        {item.fileFragment.language || "code"} • {item.fileFragment.lineCount || 1} lines
                      </span>
                    </div>
                  </div>
                )}
                <div className="chat-message-text">
                  {item.sender === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {typedText[item.id] ?? item.text}
                    </ReactMarkdown>
                  ) : (
                    item.text
                  )}
                </div>
                <div className="chat-bubble-footer">
                  <div className="chat-message-actions">
                    <button
                      type="button"
                      className="chat-action-btn small"
                      onClick={() => handleCopyMessage(item.text)}
                      title="Copy message"
                    >
                      <FaCopy />
                    </button>
                    {item.sender === "assistant" ? (
                      <button
                        type="button"
                        className="chat-action-btn small"
                        onClick={() => handleRegenerateResponse(item.id)}
                        title="Regenerate response"
                      >
                        <FaRedo />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="chat-action-btn small"
                          onClick={() => handleEditMessage(item.id, item.text)}
                          title="Edit message"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="chat-action-btn small"
                          onClick={() => handleDeleteMessage(item.id)}
                          title="Delete message"
                        >
                          <FaTrashAlt />
                        </button>
                      </>
                    )}
                  </div>
                  <div className={`chat-message-time ${item.sender}`}>{item.time}</div>
                </div>
              </div>

              {item.sender === "user" && (
                <div className="chat-avatar right">
                  <FaUserCircle />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="chat-message assistant loading-message">
            <div className="chat-bubble assistant">
              <div className="cypher-bubble-avatar-wrapper pulsing">
                <img src="/cypher.png" alt="Cypher" className="cypher-bubble-avatar" />
              </div>
              <div className="chat-message-body loading-body">
                <div className="cypher-thinking-indicator">
                  <FaSpinner className="spin-icon" />
                  <span>Cypher is analyzing code security...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Security Actions */}
      <div className="chat-quick-actions">
        <button
          type="button"
          className="quick-action-pill highlight"
          onClick={handleFullCodebaseScan}
          disabled={isLoading || Boolean(scanProgress)}
          title="Run full SAST security scan across all codebase files one-by-one (strictly respecting .gitignore)"
        >
          <FaFolderOpen className="pill-icon blue" />
          <span>Codebase Scan</span>
        </button>

        <button
          type="button"
          className="quick-action-pill"
          onClick={handleScanActiveFile}
          disabled={isLoading || Boolean(scanProgress)}
          title={activeFile ? `Scan ${activeFile.name} with Cypher` : "Scan currently open file"}
        >
          <FaShieldAlt className="pill-icon green" />
          <span>Scan Active File</span>
        </button>

        <button
          type="button"
          className="quick-action-pill"
          onClick={handleOwaspAudit}
          disabled={isLoading || Boolean(scanProgress)}
          title={activeFile ? `Audit ${activeFile.name} against OWASP Top 10` : "OWASP Top 10 Security Audit"}
        >
          <FaBug className="pill-icon red" />
          <span>OWASP Audit</span>
        </button>

        <button
          type="button"
          className="quick-action-pill"
          onClick={handleSecretsCheck}
          disabled={isLoading || Boolean(scanProgress)}
          title={activeFile ? `Scan ${activeFile.name} for hardcoded secrets` : "Scan for secrets & API keys"}
        >
          <FaKey className="pill-icon yellow" />
          <span>Secrets Check</span>
        </button>
      </div>

      {/* Codebase Scan Live Progress Card */}
      {scanProgress && (
        <div className="codebase-scan-progress-card">
          <div className="scan-progress-header">
            <div className="scan-progress-title">
              <FaShieldAlt className="scan-shield-spin" />
              <span>Scanning Codebase ({scanProgress.current}/{scanProgress.total})</span>
            </div>
            <button
              type="button"
              className="scan-cancel-btn"
              onClick={() => { cancelScanRef.current = true; }}
              title="Cancel Codebase Scan"
            >
              Cancel
            </button>
          </div>
          <div className="scan-file-label" title={scanProgress.currentFile}>
            <code>{scanProgress.currentFile}</code>
          </div>
          <div className="scan-meter-track">
            <div
              className="scan-meter-fill"
              style={{ width: `${Math.round((scanProgress.current / (scanProgress.total || 1)) * 100)}%` }}
            />
          </div>
          <div className="scan-stats-row">
            <span className="stat-pill clean">Clean: {scanProgress.clean}</span>
            {scanProgress.critical > 0 && <span className="stat-pill critical">Critical: {scanProgress.critical}</span>}
            {scanProgress.high > 0 && <span className="stat-pill high">High: {scanProgress.high}</span>}
            {scanProgress.medium > 0 && <span className="stat-pill medium">Medium: {scanProgress.medium}</span>}
          </div>
        </div>
      )}

      {/* Attached File Chip above textarea */}
      {attachedFile && (
        <div className="chat-attached-file-bar">
          <div className="attached-file-chip">
            <FaFileCode className="attached-chip-icon" />
            <span className="attached-chip-name">{attachedFile.name}</span>
            <span className="attached-chip-meta">({attachedFile.lineCount} lines)</span>
            <button
              type="button"
              className="attached-chip-remove"
              onClick={() => setAttachedFile(null)}
              title="Remove attachment"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        {activeFile && (
          <button
            type="button"
            className={`chat-attach-btn ${attachedFile ? "active" : ""}`}
            onClick={() => {
              if (attachedFile) {
                setAttachedFile(null);
              } else {
                setAttachedFile({
                  name: activeFile.name,
                  language: activeFile.language || "javascript",
                  content: activeFile.content || "",
                  lineCount: (activeFile.content || "").split("\n").length
                });
              }
            }}
            title={attachedFile ? `Remove ${attachedFile.name}` : `Attach ${activeFile.name}`}
          >
            <FaPaperclip />
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            resizeTextarea();
          }}
          onInput={resizeTextarea}
          onKeyDown={handleKeyDown}
          placeholder={attachedFile ? `Ask Cypher about ${attachedFile.name}...` : "Ask Cypher or paste code to analyze security..."}
          className="chat-input"
          disabled={isLoading}
        />
        <button
          type="button"
          className={`chat-send-btn ${isLoading ? "loading" : ""}`}
          onClick={() => handleSend()}
          disabled={isLoading}
          title="Send to Cypher"
        >
          {isLoading ? <FaSpinner className="spin-icon" /> : <FaPaperPlane />}
        </button>
      </div>
    </div>
  );
}

export default Chat;
