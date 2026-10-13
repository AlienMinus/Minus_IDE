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
  FaTimes
} from "react-icons/fa";
import { sendChatMessage, getAiStatus } from "../../services/aiService";
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
  const [attachedFile, setAttachedFile] = useState(null);

  const [selectedModel, setSelectedModel] = useState(() => {
    try {
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
    } catch {}
  };

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
      if (status.defaultModel) {
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
          className="quick-action-pill"
          onClick={handleScanActiveFile}
          title={activeFile ? `Scan ${activeFile.name} with Cypher` : "Scan currently open file"}
        >
          <FaShieldAlt className="pill-icon green" />
          <span>Scan Active File</span>
        </button>

        <button
          type="button"
          className="quick-action-pill"
          onClick={handleOwaspAudit}
          title={activeFile ? `Audit ${activeFile.name} against OWASP Top 10` : "OWASP Top 10 Security Audit"}
        >
          <FaBug className="pill-icon red" />
          <span>OWASP Audit</span>
        </button>

        <button
          type="button"
          className="quick-action-pill"
          onClick={handleSecretsCheck}
          title={activeFile ? `Scan ${activeFile.name} for hardcoded secrets` : "Scan for secrets & API keys"}
        >
          <FaKey className="pill-icon yellow" />
          <span>Secrets Check</span>
        </button>
      </div>

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
