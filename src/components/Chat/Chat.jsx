import "./Chat.css";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaRobot,
  FaPaperPlane,
  FaUserCircle,
  FaEdit,
  FaTrashAlt,
  FaCopy,
  FaRedo
} from "react-icons/fa";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "assistant",
      text: "**Hello User!** How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [typedText, setTypedText] = useState({});
  const typingTimers = useRef({});
  const textareaRef = useRef(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  };

  const startTyping = (messageItem) => {
    const { id, text } = messageItem;
    if (typingTimers.current[id]) {
      clearInterval(typingTimers.current[id]);
    }
    setTypedText((prev) => ({ ...prev, [id]: "" }));
    let index = 0;
    typingTimers.current[id] = setInterval(() => {
      index += 1;
      setTypedText((prev) => ({ ...prev, [id]: text.slice(0, index) }));
      if (index >= text.length) {
        clearInterval(typingTimers.current[id]);
        delete typingTimers.current[id];
      }
    }, 20);
  };

  const handleSend = () => {
    if (!message.trim()) return;

    if (editingMessageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                text: message.trim(),
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            : msg
        )
      );
      setEditingMessageId(null);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: "user",
          text: message.trim(),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }

    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "54px";
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

  const handleRegenerateResponse = (id) => {
    const messageItem = messages.find((msg) => msg.id === id);
    if (messageItem?.sender !== "assistant") return;
    startTyping(messageItem);
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
      <div className="chat-header">
        <div className="chat-title-group">
          <div className="chat-title-icon">
            <FaRobot />
          </div>
          <div>
            <h3>Chat Assistant</h3>
            <p>AI-powered support for your workspace.</p>
          </div>
        </div>
        <span className="chat-status">Online</span>
      </div>

      <div className="chat-messages">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`chat-message ${item.sender === "user" ? "user" : "assistant"}`}
          >
            <div className={`chat-bubble ${item.sender}`}>
              {item.sender === "assistant" && (
                <div className="chat-avatar left">
                  <FaRobot />
                </div>
              )}

              <div className="chat-message-body">
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
      </div>

      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            resizeTextarea();
          }}
          onInput={resizeTextarea}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          className="chat-input"
        />
        <button type="button" className="chat-send-btn" onClick={handleSend}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}

export default Chat;
