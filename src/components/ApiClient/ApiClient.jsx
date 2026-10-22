// src/components/ApiClient/ApiClient.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ApiClient.css";
import {
  GiCurledTentacle
} from "react-icons/gi";
import {
  FaPlay,
  FaCopy,
  FaCheck,
  FaTrash,
  FaHistory,
  FaBolt,
  FaMagic,
  FaExternalLinkAlt,
  FaPlus,
  FaTimes,
  FaExchangeAlt,
  FaTerminal,
  FaCode,
  FaChevronDown,
  FaChevronRight,
  FaClock,
  FaDatabase,
  FaGlobe,
  FaLock,
  FaUnlock,
  FaCog,
  FaShieldAlt,
  FaSearch,
  FaDownload,
  FaEye,
  FaListAlt
} from "react-icons/fa";
import {
  VscRefresh,
  VscClearAll,
  VscJson,
  VscSparkle,
  VscShield
} from "react-icons/vsc";
import useEditor from "../../hooks/useEditor";
import { extractWorkspaceRoutes } from "../../services/backendRouteParser";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const LOCAL_PORTS = [
  { port: "3000", label: ":3000 Express" },
  { port: "5000", label: ":5000 App" },
  { port: "5005", label: ":5005 Local AI" },
  { port: "5173", label: ":5173 Vite" },
  { port: "8000", label: ":8000 Python" },
  { port: "8080", label: ":8080 Backend" }
];

const PRESETS_LOCAL = [
  {
    name: "Hyperion Health (3000)",
    method: "GET",
    url: "http://localhost:3000/health",
    headers: [],
    body: "",
    env: "localhost"
  },
  {
    name: "Sandbox Server Status (3000)",
    method: "GET",
    url: "http://localhost:3000/api/sandbox/status",
    headers: [],
    body: "",
    env: "localhost"
  },
  {
    name: "Local Qwen AI Status (5005)",
    method: "GET",
    url: "http://127.0.0.1:5005/status",
    headers: [],
    body: "",
    env: "localhost"
  },
  {
    name: "Local Qwen AI Chat (5005)",
    method: "POST",
    url: "http://127.0.0.1:5005/chat",
    headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
    body: JSON.stringify({ prompt: "Write a hello world function", max_new_tokens: 120 }, null, 2),
    env: "localhost"
  },
  {
    name: "IDE AI Router Chat (3000)",
    method: "POST",
    url: "http://localhost:3000/api/ai/chat",
    headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
    body: JSON.stringify({
      messages: [{ role: "user", content: "Explain how express router works" }],
      model: "qwen-local"
    }, null, 2),
    env: "localhost"
  }
];

const PRESETS_PROD = [
  {
    name: "JSONPlaceholder Posts (Prod)",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    headers: [{ key: "Accept", value: "application/json", enabled: true }],
    body: "",
    env: "production"
  },
  {
    name: "JSONPlaceholder Create Post (Prod)",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    headers: [
      { key: "Content-Type", value: "application/json; charset=UTF-8", enabled: true },
      { key: "Accept", value: "application/json", enabled: true }
    ],
    body: JSON.stringify({ title: "Hyperion Endpoint Test", body: "Tested from Hyperion IDE", userId: 1 }, null, 2),
    env: "production"
  },
  {
    name: "DummyJSON Products (Prod)",
    method: "GET",
    url: "https://dummyjson.com/products/1",
    headers: [{ key: "Accept", value: "application/json", enabled: true }],
    body: "",
    env: "production"
  },
  {
    name: "GitHub Public Zen API (Prod)",
    method: "GET",
    url: "https://api.github.com/zen",
    headers: [{ key: "Accept", value: "application/vnd.github.v3+json", enabled: true }],
    body: "",
    env: "production"
  },
  {
    name: "Production Base Health Check",
    method: "GET",
    url: "{{baseUrl}}/health",
    headers: [{ key: "Accept", value: "application/json", enabled: true }],
    body: "",
    env: "production"
  },
  {
    name: "Production Base API Status",
    method: "GET",
    url: "{{baseUrl}}/api/status",
    headers: [{ key: "Accept", value: "application/json", enabled: true }],
    body: "",
    env: "production"
  }
];

// Helper to tokenize and syntax highlight a line of JSON
function highlightJsonLineTokens(line) {
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g;
  const elements = [];
  let lastIdx = 0;
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      elements.push(
        <span key={`plain-${lastIdx}`} className="json-plain">
          {line.slice(lastIdx, match.index)}
        </span>
      );
    }
    const token = match[0];
    let cls = "json-plain";

    if (token.startsWith('"')) {
      if (token.endsWith(":") || line.slice(match.index + token.length).trim().startsWith(":")) {
        cls = "json-key";
      } else {
        cls = "json-string";
      }
    } else if (token === "true" || token === "false") {
      cls = "json-boolean";
    } else if (token === "null") {
      cls = "json-null";
    } else if (/^-?\d/.test(token)) {
      cls = "json-number";
    } else if (/[{}[\]]/.test(token)) {
      cls = "json-bracket";
    } else if (token === ":") {
      cls = "json-colon";
    } else if (token === ",") {
      cls = "json-comma";
    }

    elements.push(
      <span key={`tok-${match.index}`} className={cls}>
        {token}
      </span>
    );
    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < line.length) {
    elements.push(
      <span key={`plain-${lastIdx}`} className="json-plain">
        {line.slice(lastIdx)}
      </span>
    );
  }

  return elements.length > 0 ? elements : line;
}

export default function ApiClient({ onOpenFullView = null, isFullTab = false }) {
  const { files = [] } = useEditor();

  // Environment Settings & Variables
  const [environment, setEnvironment] = useState(() => {
    return localStorage.getItem("hyperion_api_env") || "localhost";
  }); // "localhost" | "production" | "staging" | "custom"

  const [envConfig, setEnvConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("hyperion_api_env_config");
      return saved
        ? JSON.parse(saved)
        : {
            localhostBase: "http://localhost:3000",
            productionBase: "https://api.example.com",
            stagingBase: "https://staging-api.example.com",
            customBase: "https://",
            prodToken: "",
            stagingToken: "",
            prodApiKey: "",
            insecureSsl: false,
            timeoutSec: 30
          };
    } catch {
      return {
        localhostBase: "http://localhost:3000",
        productionBase: "https://api.example.com",
        stagingBase: "https://staging-api.example.com",
        customBase: "https://",
        prodToken: "",
        stagingToken: "",
        prodApiKey: "",
        insecureSsl: false,
        timeoutSec: 30
      };
    }
  });

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [presetsCategory, setPresetsCategory] = useState("all");

  // Request State
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("http://localhost:3000/health");
  const [requestTab, setRequestTab] = useState("params");
  const [queryParams, setQueryParams] = useState([]);
  const [headers, setHeaders] = useState([
    { key: "Content-Type", value: "application/json", enabled: true },
    { key: "Accept", value: "application/json", enabled: true }
  ]);
  const [bodyType, setBodyType] = useState("json");
  const [bodyContent, setBodyContent] = useState("");
  const [authType, setAuthType] = useState("none");
  const [authToken, setAuthToken] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");

  // Response State & Formatting
  const [response, setResponse] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [responseTab, setResponseTab] = useState("body"); // "body" | "headers" | "ai"
  const [bodyViewMode, setBodyViewMode] = useState("pretty"); // "pretty" | "raw" | "preview"
  const [responseSearchQuery, setResponseSearchQuery] = useState("");
  const [headersSearchQuery, setHeadersSearchQuery] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedAiAnalysis, setCopiedAiAnalysis] = useState(false);

  // AI Assistant States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiError, setAiError] = useState("");

  // History & Import Modals
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("hyperion_api_client_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCurlText, setImportCurlText] = useState("");
  const [importError, setImportError] = useState("");

  // Discovered backend routes from codebase
  const discoveredRoutes = useMemo(() => {
    try {
      const { endpoints = [] } = extractWorkspaceRoutes(files);
      return endpoints.slice(0, 15);
    } catch {
      return [];
    }
  }, [files]);

  // Persist envConfig & environment
  useEffect(() => {
    try {
      localStorage.setItem("hyperion_api_env", environment);
      localStorage.setItem("hyperion_api_env_config", JSON.stringify(envConfig));
    } catch {
      // ignore
    }
  }, [environment, envConfig]);

  // Keep history in localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hyperion_api_client_history", JSON.stringify(history.slice(0, 25)));
    } catch {
      // ignore
    }
  }, [history]);

  // Active Base URL determination
  const activeBaseUrl = useMemo(() => {
    switch (environment) {
      case "production":
        return envConfig.productionBase?.trim().replace(/\/+$/, "") || "https://api.example.com";
      case "staging":
        return envConfig.stagingBase?.trim().replace(/\/+$/, "") || "https://staging-api.example.com";
      case "custom":
        return envConfig.customBase?.trim().replace(/\/+$/, "") || "";
      case "localhost":
      default:
        return envConfig.localhostBase?.trim().replace(/\/+$/, "") || "http://localhost:3000";
    }
  }, [environment, envConfig]);

  // Resolve {{baseUrl}} or relative paths into absolute URL
  const resolvedUrl = useMemo(() => {
    if (!url) return "";
    let res = url.trim();

    if (res.includes("{{baseUrl}}")) {
      res = res.replace(/\{\{baseUrl\}\}/g, activeBaseUrl);
    } else if (res.startsWith("/")) {
      res = `${activeBaseUrl}${res}`;
    }

    if (res.includes("{{token}}")) {
      const tok = environment === "production" ? envConfig.prodToken : envConfig.stagingToken;
      res = res.replace(/\{\{token\}\}/g, tok || "");
    }

    return res;
  }, [url, activeBaseUrl, environment, envConfig]);

  const isHttps = useMemo(() => {
    return (resolvedUrl || url).toLowerCase().startsWith("https://");
  }, [resolvedUrl, url]);

  // Handle Environment Switch
  const handleEnvironmentChange = (newEnv) => {
    setEnvironment(newEnv);
    if (newEnv === "production" && url.startsWith("http://localhost")) {
      const path = url.replace(/^https?:\/\/[^/]+/, "");
      setUrl(`{{baseUrl}}${path || "/"}`);
      if (envConfig.prodToken && authType === "bearer" && !authToken) {
        setAuthToken(envConfig.prodToken);
      }
    } else if (newEnv === "localhost" && url.startsWith("https://")) {
      const path = url.replace(/^https?:\/\/[^/]+/, "");
      setUrl(`http://localhost:3000${path || "/"}`);
    }
  };

  // Sync Query Params with URL
  const handleQueryParamChange = (index, field, value) => {
    const next = [...queryParams];
    next[index][field] = value;
    setQueryParams(next);
    rebuildUrlFromParams(next);
  };

  const handleAddQueryParam = () => {
    setQueryParams([...queryParams, { key: "", value: "", enabled: true }]);
  };

  const handleRemoveQueryParam = (index) => {
    const next = queryParams.filter((_, i) => i !== index);
    setQueryParams(next);
    rebuildUrlFromParams(next);
  };

  const rebuildUrlFromParams = (paramsList) => {
    try {
      const [baseUrl] = url.split("?");
      const activeParams = paramsList.filter((p) => p.enabled && p.key.trim());
      if (activeParams.length === 0) {
        setUrl(baseUrl);
        return;
      }
      const searchParams = new URLSearchParams();
      activeParams.forEach((p) => searchParams.append(p.key.trim(), p.value));
      setUrl(`${baseUrl}?${searchParams.toString()}`);
    } catch {
      // url might be partial
    }
  };

  // Quick switch port in URL
  const handleSelectPort = (port) => {
    setEnvironment("localhost");
    try {
      if (!url.startsWith("http")) {
        setUrl(`http://localhost:${port}/`);
        return;
      }
      const u = new URL(resolvedUrl);
      u.port = port;
      u.hostname = "localhost";
      u.protocol = "http:";
      setUrl(u.toString());
    } catch {
      setUrl(`http://localhost:${port}/`);
    }
  };

  // Header management
  const handleHeaderChange = (index, field, value) => {
    const next = [...headers];
    next[index][field] = value;
    setHeaders(next);
  };

  const handleAddHeader = (key = "", value = "") => {
    setHeaders([...headers, { key, value, enabled: true }]);
  };

  const handleRemoveHeader = (index) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  // Generate executable cURL Command
  const generatedCurl = useMemo(() => {
    const targetUrl = resolvedUrl || url;
    let cmd = `curl -X ${method} "${targetUrl}"`;

    if (envConfig.insecureSsl) {
      cmd += " -k";
    }

    const activeHeaders = headers.filter((h) => h.enabled && h.key.trim());
    activeHeaders.forEach((h) => {
      let val = h.value.trim();
      if (val === "{{token}}") {
        val = (environment === "production" ? envConfig.prodToken : envConfig.stagingToken) || "YOUR_TOKEN";
      }
      cmd += ` \\\n  -H "${h.key.trim()}: ${val}"`;
    });

    if (authType === "bearer") {
      const tokenVal = authToken.trim() || (environment === "production" ? envConfig.prodToken : envConfig.stagingToken);
      if (tokenVal) {
        cmd += ` \\\n  -H "Authorization: Bearer ${tokenVal}"`;
      }
    } else if (authType === "basic" && (authUsername || authPassword)) {
      cmd += ` \\\n  -u "${authUsername}:${authPassword}"`;
    } else if (authType === "apikey" && apiKeyName.trim()) {
      const keyVal = apiKeyValue.trim() || (environment === "production" ? envConfig.prodApiKey : "");
      if (keyVal) {
        cmd += ` \\\n  -H "${apiKeyName.trim()}: ${keyVal}"`;
      }
    }

    if (bodyType !== "none" && bodyContent.trim() && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const sanitizedBody = bodyContent.replace(/"/g, '\\"').replace(/\n/g, "");
      cmd += ` \\\n  -d "${sanitizedBody}"`;
    }

    cmd += " \\\n  --compressed";
    return cmd;
  }, [
    method,
    resolvedUrl,
    url,
    headers,
    authType,
    authToken,
    authUsername,
    authPassword,
    apiKeyName,
    apiKeyValue,
    bodyType,
    bodyContent,
    envConfig,
    environment
  ]);

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generatedCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleFormatBody = () => {
    try {
      const parsed = JSON.parse(bodyContent);
      setBodyContent(JSON.stringify(parsed, null, 2));
    } catch (err) {
      alert("Invalid JSON: " + err.message);
    }
  };

  const handleImportCurl = () => {
    setImportError("");
    const raw = importCurlText.replace(/\\\r?\n/g, " ").trim();
    if (!raw.toLowerCase().startsWith("curl")) {
      setImportError("Command must start with 'curl'");
      return;
    }

    try {
      let parsedMethod = "GET";
      let parsedUrl = "";
      const parsedHeaders = [];
      let parsedBody = "";

      const methodMatch = raw.match(/(?:-X|--request)\s+([A-Za-z]+)/);
      if (methodMatch) parsedMethod = methodMatch[1].toUpperCase();

      const headerRegex = /(?:-H|--header)\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)/g;
      let hMatch;
      while ((hMatch = headerRegex.exec(raw)) !== null) {
        let hVal = hMatch[1];
        if ((hVal.startsWith('"') && hVal.endsWith('"')) || (hVal.startsWith("'") && hVal.endsWith("'"))) {
          hVal = hVal.slice(1, -1);
        }
        const cIdx = hVal.indexOf(":");
        if (cIdx > 0) {
          const k = hVal.slice(0, cIdx).trim();
          const v = hVal.slice(cIdx + 1).trim();
          if (k.toLowerCase() === "authorization" && v.toLowerCase().startsWith("bearer ")) {
            setAuthType("bearer");
            setAuthToken(v.slice(7).trim());
          } else {
            parsedHeaders.push({ key: k, value: v, enabled: true });
          }
        }
      }

      const bodyMatch = raw.match(/(?:-d|--data|--data-raw|--data-binary)\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)/);
      if (bodyMatch) {
        let bVal = bodyMatch[1];
        if ((bVal.startsWith('"') && bVal.endsWith('"')) || (bVal.startsWith("'") && bVal.endsWith("'"))) {
          bVal = bVal.slice(1, -1);
        }
        parsedBody = bVal.replace(/\\"/g, '"');
        if (!methodMatch) parsedMethod = "POST";
      }

      const urlMatch = raw.match(/https?:\/\/[^\s'"]+/i);
      if (urlMatch) {
        parsedUrl = urlMatch[0];
      } else {
        const tokens = raw.split(/\s+/);
        for (let i = 1; i < tokens.length; i++) {
          const t = tokens[i].replace(/^['"]|['"]$/g, "");
          if (t.includes(".") || t.includes("localhost") || t.startsWith("http")) {
            parsedUrl = t.startsWith("http") ? t : `https://${t}`;
            break;
          }
        }
      }

      if (!parsedUrl) {
        setImportError("Could not locate a target URL in the cURL command.");
        return;
      }

      setMethod(parsedMethod);
      setUrl(parsedUrl);
      if (parsedUrl.startsWith("https://")) setEnvironment("production");
      if (parsedHeaders.length > 0) setHeaders(parsedHeaders);
      if (parsedBody) {
        setBodyType("json");
        try {
          setBodyContent(JSON.stringify(JSON.parse(parsedBody), null, 2));
        } catch {
          setBodyContent(parsedBody);
        }
      }

      setIsImportOpen(false);
      setImportCurlText("");
    } catch (err) {
      setImportError("Error parsing cURL: " + err.message);
    }
  };

  // SEND REQUEST via cURL Proxy
  const handleSendRequest = async () => {
    const targetUrl = resolvedUrl || url;
    if (!targetUrl.trim()) return;

    setIsSending(true);
    setResponse(null);
    setAiAnalysis("");
    setAiError("");

    const startTime = performance.now();

    const finalHeadersObj = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        let val = h.value.trim();
        if (val === "{{token}}") {
          val = (environment === "production" ? envConfig.prodToken : envConfig.stagingToken) || "";
        }
        finalHeadersObj[h.key.trim()] = val;
      }
    });

    if (authType === "bearer") {
      const token = authToken.trim() || (environment === "production" ? envConfig.prodToken : envConfig.stagingToken);
      if (token) finalHeadersObj["Authorization"] = `Bearer ${token}`;
    } else if (authType === "basic" && (authUsername || authPassword)) {
      finalHeadersObj["Authorization"] = `Basic ${btoa(`${authUsername}:${authPassword}`)}`;
    } else if (authType === "apikey" && apiKeyName.trim()) {
      const val = apiKeyValue.trim() || (environment === "production" ? envConfig.prodApiKey : "");
      if (val) finalHeadersObj[apiKeyName.trim()] = val;
    }

    const hasBody = bodyType !== "none" && bodyContent.trim() && ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    try {
      const proxyRes = await fetch("/api/sandbox/curl-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          url: targetUrl,
          headers: finalHeadersObj,
          body: hasBody ? bodyContent : undefined,
          timeoutMs: (Number(envConfig.timeoutSec) || 30) * 1000
        })
      });

      const result = await proxyRes.json();
      const elapsed = Math.round(performance.now() - startTime);

      let finalResp;
      if (result.success) {
        finalResp = {
          status: result.status,
          statusText: result.statusText || "OK",
          durationMs: result.durationMs || elapsed,
          sizeBytes: result.sizeBytes || 0,
          headers: result.headers || {},
          data: result.data,
          rawText:
            result.rawText || (typeof result.data === "object" ? JSON.stringify(result.data, null, 2) : String(result.data)),
          targetUrl,
          environment,
          timestamp: new Date().toLocaleTimeString()
        };
      } else {
        finalResp = {
          status: result.status || 0,
          statusText: result.statusText || "Connection Failed",
          durationMs: result.durationMs || elapsed,
          sizeBytes: 0,
          headers: {},
          data: null,
          rawText:
            result.error || "Could not connect to target endpoint. Check DNS, server availability, or firewall rules.",
          isError: true,
          targetUrl,
          environment,
          timestamp: new Date().toLocaleTimeString()
        };
      }

      setResponse(finalResp);

      const historyItem = {
        id: Date.now(),
        method,
        url: targetUrl,
        environment,
        status: finalResp.status,
        durationMs: finalResp.durationMs,
        timestamp: finalResp.timestamp
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 24)]);
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      setResponse({
        status: 0,
        statusText: "Network Error",
        durationMs: elapsed,
        sizeBytes: 0,
        headers: {},
        data: null,
        rawText: `Request error: ${err.message}. If testing a production API, ensure internet access is active and domain is reachable.`,
        isError: true,
        targetUrl,
        environment,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsSending(false);
    }
  };

  // AI: Generate Sample Request Payload
  const handleAiGenerateBody = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const prompt = `You are an API testing assistant. Based on this HTTP request:
Method: ${method}
URL: ${resolvedUrl || url}
Environment: ${environment}
Generate a realistic, production-ready sample JSON request body for this endpoint.
Output ONLY valid JSON. No explanations, no markdown formatting, just pure JSON text.`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: "qwen-local"
        })
      });

      const data = await res.json();
      let generated = data.message || "";
      generated = generated.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      try {
        const parsed = JSON.parse(generated);
        setBodyType("json");
        setBodyContent(JSON.stringify(parsed, null, 2));
        setRequestTab("body");
      } catch {
        setBodyType("json");
        setBodyContent(generated);
        setRequestTab("body");
      }
    } catch (err) {
      setAiError("AI Body Generation failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Analyze Response
  const handleAiAnalyzeResponse = async () => {
    if (!response) return;
    setAiLoading(true);
    setAiError("");
    setResponseTab("ai");
    try {
      const prompt = `You are an expert API diagnostician. Analyze this HTTP response for a developer:
Endpoint: ${method} ${response.targetUrl || url}
Environment: ${environment.toUpperCase()}
Status: ${response.status} ${response.statusText}
Latency: ${response.durationMs}ms
Payload Size: ${response.sizeBytes} bytes
Headers: ${JSON.stringify(response.headers, null, 2)}
Response Body:
${(response.rawText || "").slice(0, 1500)}

Provide a formatted markdown breakdown with clear headers:
## 📊 Status & Latency Assessment
Explain whether the status code and latency are optimal.

## 📦 Payload Structure & Schema
Analyze key fields, objects, or arrays returned in the response.

## 💡 Recommendations & Insights
Detail performance, security, and caching improvements.`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: "qwen-local"
        })
      });

      const data = await res.json();
      setAiAnalysis(data.message || "No analysis generated.");
    } catch (err) {
      setAiError("AI Analysis failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Production Security Audit
  const handleAiSecurityAudit = async () => {
    if (!response) return;
    setAiLoading(true);
    setAiError("");
    setResponseTab("ai");
    try {
      const prompt = `You are a Senior Application Security Engineer. Perform a comprehensive Security Audit on this HTTP response:
Target URL: ${response.targetUrl || url}
Method: ${method}
Status: ${response.status} ${response.statusText}
Headers: ${JSON.stringify(response.headers, null, 2)}
Body Sample: ${(response.rawText || "").slice(0, 1200)}

Format your response in clean, professional markdown with headings, bullets, and code blocks:
## 🔐 Cypher Credential & Secret Leak Security Audit

### 🛡️ Production Headers Assessment
- Check for **Strict-Transport-Security (HSTS)**, **Content-Security-Policy (CSP)**, **X-Content-Type-Options**, and **Cache-Control**.
- Evaluate **CORS** headers (e.g. check for permissive wildcards \`Access-Control-Allow-Origin: *\`).

### 🧲 Secret & Sensitive Data Scrutiny
Evaluate if any tokens, JWTs, database connection URIs, server stack traces, or internal IP addresses are exposed in headers or body.

### 📋 Actionable Security Hardening Steps
Provide exact code and configuration steps to harden this endpoint.`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: "qwen-local"
        })
      });

      const data = await res.json();
      setAiAnalysis(data.message || "No audit output generated.");
    } catch (err) {
      setAiError("AI Security Audit failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Fix Request on Error
  const handleAiFixRequest = async () => {
    if (!response) return;
    setAiLoading(true);
    setAiError("");
    setResponseTab("ai");
    try {
      const prompt = `The following HTTP request failed against a backend endpoint:
Environment: ${environment.toUpperCase()}
Request: ${method} ${response.targetUrl || url}
Headers: ${JSON.stringify(headers.filter((h) => h.enabled))}
Body: ${bodyContent || "None"}

Response:
Status: ${response.status} ${response.statusText}
Error Body:
${(response.rawText || "").slice(0, 1500)}

Format your response in clean markdown:
## ⚠️ Failure Diagnosis
Explain why this request failed (e.g., missing parameter, auth error, validation error).

## 🛠️ Corrected Request (cURL)
Provide the exact corrected cURL command and payload.`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: "qwen-local"
        })
      });

      const data = await res.json();
      setAiAnalysis(data.message || "No fix suggestion returned.");
    } catch (err) {
      setAiError("AI Fix diagnosis failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Load a preset
  const handleLoadPreset = (preset) => {
    setMethod(preset.method);
    setUrl(preset.url);
    if (preset.env) setEnvironment(preset.env);
    if (preset.headers) setHeaders(preset.headers);
    if (preset.body) {
      setBodyType("json");
      setBodyContent(preset.body);
    } else {
      setBodyContent("");
    }
  };

  const handleLoadHistory = (item) => {
    setMethod(item.method);
    setUrl(item.url);
    if (item.environment) setEnvironment(item.environment);
  };

  const handleCopyResponse = () => {
    if (!response?.rawText) return;
    navigator.clipboard.writeText(response.rawText);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleCopyAiAnalysis = () => {
    if (!aiAnalysis) return;
    navigator.clipboard.writeText(aiAnalysis);
    setCopiedAiAnalysis(true);
    setTimeout(() => setCopiedAiAnalysis(false), 2000);
  };

  const handleDownloadResponse = () => {
    if (!response?.rawText) return;
    const isJson = typeof response.data === "object";
    const blob = new Blob([isJson ? JSON.stringify(response.data, null, 2) : response.rawText], {
      type: isJson ? "application/json" : "text/plain"
    });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `response_${response.status}_${Date.now()}.${isJson ? "json" : "txt"}`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return "#22c55e";
    if (status >= 300 && status < 400) return "#3b82f6";
    if (status >= 400 && status < 500) return "#f59e0b";
    if (status >= 500) return "#ef4444";
    return "#888888";
  };

  // Prepare formatted JSON lines for Pretty Viewer
  const formattedJsonLines = useMemo(() => {
    if (!response) return [];
    let text = response.rawText || "";
    if (typeof response.data === "object" && response.data !== null) {
      try {
        text = JSON.stringify(response.data, null, 2);
      } catch {
        text = response.rawText || "";
      }
    }
    return text.split("\n");
  }, [response]);

  // Filtered Headers Table
  const filteredHeaders = useMemo(() => {
    if (!response?.headers) return [];
    const entries = Object.entries(response.headers);
    if (!headersSearchQuery.trim()) return entries;
    const q = headersSearchQuery.toLowerCase().trim();
    return entries.filter(([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q));
  }, [response?.headers, headersSearchQuery]);

  return (
    <div className={`api-client-container ${isFullTab ? "full-tab-mode" : "sidebar-mode"}`}>
      {/* Top Header */}
      <div className="api-client-header">
        <div className="api-client-title-row">
          <div className="api-client-brand">
            <GiCurledTentacle className="api-tentacle-icon" />
            <span className="api-brand-text">API Client & cURL</span>
            <span className={`api-env-badge env-${environment}`}>
              {environment === "production" ? "🚀 PROD" : environment === "staging" ? "🧪 STAGING" : "🖥️ LOCAL"}
            </span>
          </div>

          <div className="api-header-actions">
            <button
              className="api-btn-text"
              onClick={() => setIsEnvModalOpen(true)}
              title="Manage Environments & Variables"
            >
              <FaCog /> Env Config
            </button>
            <button
              className="api-btn-text"
              onClick={() => setIsImportOpen(true)}
              title="Import cURL command"
            >
              <FaTerminal /> Import cURL
            </button>
            {onOpenFullView && !isFullTab && (
              <button
                className="api-btn-icon"
                onClick={onOpenFullView}
                title="Expand to Full Tab"
              >
                <FaExternalLinkAlt />
              </button>
            )}
          </div>
        </div>

        {/* Environment & Target Selector Bar */}
        <div className="api-env-controls-bar">
          <div className="api-env-selector-group">
            <span className="api-env-label">
              <FaGlobe /> Environment:
            </span>
            <select
              className="api-env-select"
              value={environment}
              onChange={(e) => handleEnvironmentChange(e.target.value)}
            >
              <option value="localhost">Localhost (Development)</option>
              <option value="production">Production Backend</option>
              <option value="staging">Staging Environment</option>
              <option value="custom">Custom Endpoint</option>
            </select>
          </div>

          {environment === "localhost" ? (
            <div className="api-ports-bar">
              <span className="api-ports-label">Ports:</span>
              {LOCAL_PORTS.map((p) => (
                <button
                  key={p.port}
                  className={`api-port-pill ${resolvedUrl.includes(`:${p.port}`) ? "active" : ""}`}
                  onClick={() => handleSelectPort(p.port)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="api-prod-target-info">
              <span className="api-prod-base-label">Base URL:</span>
              <span className="api-prod-base-val" title={activeBaseUrl}>
                {activeBaseUrl}
              </span>
              <button
                className="api-btn-xs"
                onClick={() => setIsEnvModalOpen(true)}
                title="Edit base URL"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Request & Response Layout */}
      <div className="api-client-body-layout">
        {/* Request Pane */}
        <div className="api-request-pane">
          {/* Method + URL Input + Protocol Badge + Send Button */}
          <div className="api-url-bar-container">
            <div className="api-url-bar">
              <select
                className={`api-method-select method-${method.toLowerCase()}`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <span
                className={`api-protocol-badge ${isHttps ? "https" : "http"}`}
                title={isHttps ? "Secure HTTPS connection" : "HTTP connection"}
              >
                {isHttps ? <FaLock /> : <FaUnlock />} {isHttps ? "HTTPS" : "HTTP"}
              </span>

              <input
                type="text"
                className="api-url-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  environment === "production"
                    ? "https://api.yourdomain.com/v1/... or {{baseUrl}}/api/..."
                    : "http://localhost:3000/api/endpoint"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleSendRequest();
                  }
                }}
              />

              <button
                className="api-send-btn"
                onClick={handleSendRequest}
                disabled={isSending}
                title="Send Request (Ctrl+Enter)"
              >
                {isSending ? (
                  <>
                    <VscRefresh className="api-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <FaPlay /> Send
                  </>
                )}
              </button>

              <button
                className="api-curl-copy-btn"
                onClick={handleCopyCurl}
                title="Copy as cURL"
              >
                {copiedCurl ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
              </button>
            </div>

            {(url.includes("{{") || url.startsWith("/")) && (
              <div className="api-resolved-url-preview">
                <span className="resolved-tag">Resolved:</span>
                <span className="resolved-address">{resolvedUrl}</span>
              </div>
            )}
          </div>

          {/* Request Sub-tabs */}
          <div className="api-tabs-nav">
            <button
              className={`api-tab-btn ${requestTab === "params" ? "active" : ""}`}
              onClick={() => setRequestTab("params")}
            >
              Params {queryParams.filter((p) => p.enabled && p.key).length > 0 && `(${queryParams.filter((p) => p.enabled && p.key).length})`}
            </button>
            <button
              className={`api-tab-btn ${requestTab === "headers" ? "active" : ""}`}
              onClick={() => setRequestTab("headers")}
            >
              Headers ({headers.filter((h) => h.enabled).length})
            </button>
            <button
              className={`api-tab-btn ${requestTab === "body" ? "active" : ""}`}
              onClick={() => setRequestTab("body")}
            >
              Body {bodyType !== "none" && bodyContent.trim() && "•"}
            </button>
            <button
              className={`api-tab-btn ${requestTab === "auth" ? "active" : ""}`}
              onClick={() => setRequestTab("auth")}
            >
              Auth {authType !== "none" && "•"}
            </button>
            <button
              className={`api-tab-btn ${requestTab === "curl" ? "active" : ""}`}
              onClick={() => setRequestTab("curl")}
            >
              cURL Preview
            </button>
            <button
              className={`api-tab-btn ${requestTab === "history" ? "active" : ""}`}
              onClick={() => setRequestTab("history")}
            >
              History ({history.length})
            </button>
          </div>

          {/* Request Tab Contents */}
          <div className="api-tab-content">
            {requestTab === "params" && (
              <div className="api-key-value-editor">
                <div className="api-kv-header">
                  <span className="api-kv-title">Query Parameters</span>
                  <button className="api-btn-xs" onClick={handleAddQueryParam}>
                    <FaPlus /> Add Param
                  </button>
                </div>

                {queryParams.length === 0 ? (
                  <div className="api-empty-state">No query parameters. Click "+ Add Param" to append to URL.</div>
                ) : (
                  queryParams.map((p, idx) => (
                    <div key={idx} className="api-kv-row">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => handleQueryParamChange(idx, "enabled", e.target.checked)}
                      />
                      <input
                        type="text"
                        placeholder="Key"
                        className="api-kv-input"
                        value={p.key}
                        onChange={(e) => handleQueryParamChange(idx, "key", e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        className="api-kv-input"
                        value={p.value}
                        onChange={(e) => handleQueryParamChange(idx, "value", e.target.value)}
                      />
                      <button className="api-btn-icon-danger" onClick={() => handleRemoveQueryParam(idx)}>
                        <FaTimes />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {requestTab === "headers" && (
              <div className="api-key-value-editor">
                <div className="api-kv-header">
                  <span className="api-kv-title">Request Headers</span>
                  <div className="api-kv-quick-actions">
                    <button
                      className="api-btn-xs"
                      onClick={() => handleAddHeader("Content-Type", "application/json")}
                    >
                      + JSON
                    </button>
                    <button
                      className="api-btn-xs"
                      onClick={() => handleAddHeader("Authorization", "Bearer {{token}}")}
                    >
                      + Bearer {{token}}
                    </button>
                    <button
                      className="api-btn-xs"
                      onClick={() => handleAddHeader("User-Agent", "Hyperion-API-Client/1.0")}
                    >
                      + User-Agent
                    </button>
                    <button className="api-btn-xs" onClick={() => handleAddHeader()}>
                      <FaPlus /> Custom
                    </button>
                  </div>
                </div>

                {headers.map((h, idx) => (
                  <div key={idx} className="api-kv-row">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => handleHeaderChange(idx, "enabled", e.target.checked)}
                    />
                    <input
                      type="text"
                      placeholder="Header Name"
                      className="api-kv-input"
                      value={h.key}
                      onChange={(e) => handleHeaderChange(idx, "key", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      className="api-kv-input"
                      value={h.value}
                      onChange={(e) => handleHeaderChange(idx, "value", e.target.value)}
                    />
                    <button className="api-btn-icon-danger" onClick={() => handleRemoveHeader(idx)}>
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {requestTab === "body" && (
              <div className="api-body-editor-wrap">
                <div className="api-body-toolbar">
                  <div className="api-radio-group">
                    <label>
                      <input
                        type="radio"
                        name="bodyType"
                        value="none"
                        checked={bodyType === "none"}
                        onChange={() => setBodyType("none")}
                      />
                      none
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="bodyType"
                        value="json"
                        checked={bodyType === "json"}
                        onChange={() => setBodyType("json")}
                      />
                      JSON
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="bodyType"
                        value="raw"
                        checked={bodyType === "raw"}
                        onChange={() => setBodyType("raw")}
                      />
                      raw
                    </label>
                  </div>

                  {bodyType !== "none" && (
                    <div className="api-body-actions">
                      <button className="api-btn-xs" onClick={handleFormatBody} title="Beautify JSON">
                        <VscJson /> Format JSON
                      </button>
                      <button
                        className="api-btn-xs api-btn-ai"
                        onClick={handleAiGenerateBody}
                        disabled={aiLoading}
                        title="AI automatically generates realistic JSON payload based on endpoint"
                      >
                        <VscSparkle /> {aiLoading ? "Generating..." : "AI Generate Body"}
                      </button>
                    </div>
                  )}
                </div>

                {bodyType === "none" ? (
                  <div className="api-empty-state">This request has no body payload.</div>
                ) : (
                  <textarea
                    className="api-body-textarea"
                    value={bodyContent}
                    onChange={(e) => setBodyContent(e.target.value)}
                    placeholder='{\n  "key": "value"\n}'
                    rows={8}
                    spellCheck={false}
                  />
                )}
              </div>
            )}

            {requestTab === "auth" && (
              <div className="api-auth-editor">
                <div className="api-auth-type-row">
                  <label className="api-auth-label">Auth Type:</label>
                  <select
                    className="api-auth-select"
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key Header</option>
                  </select>
                </div>

                {authType === "bearer" && (
                  <div className="api-auth-fields">
                    <div className="api-auth-row-info">
                      <label>Token:</label>
                      {environment === "production" && envConfig.prodToken && (
                        <button
                          className="api-btn-link"
                          onClick={() => setAuthToken(envConfig.prodToken)}
                        >
                          Use Production Token from Env
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      className="api-input"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                    />
                  </div>
                )}

                {authType === "basic" && (
                  <div className="api-auth-fields">
                    <div>
                      <label>Username:</label>
                      <input
                        type="text"
                        className="api-input"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Password:</label>
                      <input
                        type="password"
                        className="api-input"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {authType === "apikey" && (
                  <div className="api-auth-fields">
                    <div>
                      <label>Header Key Name:</label>
                      <input
                        type="text"
                        className="api-input"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Value / Key:</label>
                      <input
                        type="text"
                        className="api-input"
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {requestTab === "curl" && (
              <div className="api-curl-preview-box">
                <div className="api-curl-header">
                  <span>Production-Ready cURL Command:</span>
                  <button className="api-btn-xs" onClick={handleCopyCurl}>
                    {copiedCurl ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />} Copy
                  </button>
                </div>
                <pre className="api-curl-code">{generatedCurl}</pre>
                <div className="api-curl-tip">
                  💡 This command includes resolved production URLs, headers, and compression flags. You can run it directly in any terminal or CI/CD script.
                </div>
              </div>
            )}

            {requestTab === "history" && (
              <div className="api-history-list">
                <div className="api-history-header">
                  <span>Recent Requests</span>
                  {history.length > 0 && (
                    <button className="api-btn-xs" onClick={() => setHistory([])}>
                      <FaTrash /> Clear
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="api-empty-state">No recent requests recorded yet.</div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="api-history-item"
                      onClick={() => handleLoadHistory(item)}
                    >
                      <span className={`api-method-badge method-${item.method.toLowerCase()}`}>
                        {item.method}
                      </span>
                      <span className={`api-history-env-badge env-${item.environment || "localhost"}`}>
                        {item.environment === "production" ? "PROD" : "LOCAL"}
                      </span>
                      <span className="api-history-url" title={item.url}>
                        {item.url}
                      </span>
                      <span
                        className="api-history-status"
                        style={{ color: getStatusColor(item.status) }}
                      >
                        {item.status || "ERR"}
                      </span>
                      <span className="api-history-time">{item.durationMs}ms</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Presets Section */}
          <div className="api-presets-section">
            <div className="api-presets-header-row">
              <div className="api-presets-title">
                <FaBolt /> Quick Presets & Endpoints
              </div>
              <div className="api-presets-tabs">
                <button
                  className={`api-preset-tab-btn ${presetsCategory === "all" ? "active" : ""}`}
                  onClick={() => setPresetsCategory("all")}
                >
                  All
                </button>
                <button
                  className={`api-preset-tab-btn ${presetsCategory === "production" ? "active" : ""}`}
                  onClick={() => setPresetsCategory("production")}
                >
                  Production ({PRESETS_PROD.length})
                </button>
                <button
                  className={`api-preset-tab-btn ${presetsCategory === "localhost" ? "active" : ""}`}
                  onClick={() => setPresetsCategory("localhost")}
                >
                  Local ({PRESETS_LOCAL.length})
                </button>
                <button
                  className={`api-preset-tab-btn ${presetsCategory === "workspace" ? "active" : ""}`}
                  onClick={() => setPresetsCategory("workspace")}
                >
                  Workspace ({discoveredRoutes.length})
                </button>
              </div>
            </div>

            <div className="api-presets-chips">
              {(presetsCategory === "all" || presetsCategory === "production") &&
                PRESETS_PROD.map((p, idx) => (
                  <button
                    key={`prod-${idx}`}
                    className="api-preset-chip prod-chip"
                    onClick={() => handleLoadPreset(p)}
                    title={`[PROD] ${p.method} ${p.url}`}
                  >
                    <span className="chip-env-tag">PROD</span>
                    <span className={`chip-method method-${p.method.toLowerCase()}`}>{p.method}</span>
                    {p.name}
                  </button>
                ))}

              {(presetsCategory === "all" || presetsCategory === "localhost") &&
                PRESETS_LOCAL.map((p, idx) => (
                  <button
                    key={`local-${idx}`}
                    className="api-preset-chip local-chip"
                    onClick={() => handleLoadPreset(p)}
                    title={`[LOCAL] ${p.method} ${p.url}`}
                  >
                    <span className="chip-env-tag">LOCAL</span>
                    <span className={`chip-method method-${p.method.toLowerCase()}`}>{p.method}</span>
                    {p.name}
                  </button>
                ))}

              {(presetsCategory === "all" || presetsCategory === "workspace") &&
                discoveredRoutes.map((ep, idx) => (
                  <button
                    key={`disc-${idx}`}
                    className="api-preset-chip discovered"
                    onClick={() => {
                      setMethod(ep.method || "GET");
                      setUrl(
                        environment === "production"
                          ? `{{baseUrl}}${ep.path}`
                          : `http://localhost:3000${ep.path}`
                      );
                    }}
                    title={`Discovered Route: ${ep.method} ${ep.path}`}
                  >
                    <span className="chip-env-tag">CODE</span>
                    <span className={`chip-method method-${(ep.method || "GET").toLowerCase()}`}>
                      {ep.method}
                    </span>
                    {ep.path}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Response Panel with Enhanced Formatted Viewers */}
        <div className="api-response-pane">
          {response ? (
            <>
              {/* Response Status Bar */}
              <div className="api-response-header">
                <div className="api-status-group">
                  <span
                    className="api-status-pill"
                    style={{
                      background: `${getStatusColor(response.status)}22`,
                      color: getStatusColor(response.status),
                      borderColor: getStatusColor(response.status)
                    }}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className="api-meta-item">
                    <FaClock /> {response.durationMs} ms
                  </span>
                  <span className="api-meta-item">
                    <FaDatabase /> {response.sizeBytes} B
                  </span>
                  <span className="api-meta-item env-tag">
                    {response.environment === "production" ? "🚀 PROD" : "🖥️ LOCAL"}
                  </span>
                </div>

                <div className="api-response-actions">
                  <button
                    className="api-btn-xs"
                    onClick={handleCopyResponse}
                    title="Copy response body"
                  >
                    {copiedResponse ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />} Copy
                  </button>
                  <button
                    className="api-btn-xs"
                    onClick={handleDownloadResponse}
                    title="Download response file"
                  >
                    <FaDownload /> Download
                  </button>
                  <button
                    className="api-btn-xs api-btn-ai"
                    onClick={handleAiAnalyzeResponse}
                    disabled={aiLoading}
                    title="AI Analyze Response & Architecture"
                  >
                    <VscSparkle /> AI Analyze
                  </button>
                  <button
                    className="api-btn-xs api-btn-security"
                    onClick={handleAiSecurityAudit}
                    disabled={aiLoading}
                    title="AI Production Security & Headers Audit"
                  >
                    <VscShield /> Security Audit
                  </button>
                  {response.status >= 400 && (
                    <button
                      className="api-btn-xs api-btn-danger"
                      onClick={handleAiFixRequest}
                      disabled={aiLoading}
                      title="AI Fix Request"
                    >
                      <FaMagic /> AI Fix
                    </button>
                  )}
                </div>
              </div>

              {/* Response Sub-tabs Navigation */}
              <div className="api-tabs-nav response-nav">
                <button
                  className={`api-tab-btn ${responseTab === "body" ? "active" : ""}`}
                  onClick={() => setResponseTab("body")}
                >
                  Response Body
                </button>
                <button
                  className={`api-tab-btn ${responseTab === "headers" ? "active" : ""}`}
                  onClick={() => setResponseTab("headers")}
                >
                  Headers ({Object.keys(response.headers || {}).length})
                </button>
                <button
                  className={`api-tab-btn ${responseTab === "ai" ? "active" : ""}`}
                  onClick={() => setResponseTab("ai")}
                >
                  AI Insights & Security {aiAnalysis && "•"}
                </button>
              </div>

              {/* Sub-toolbar for Response Body */}
              {responseTab === "body" && (
                <div className="api-response-toolbar">
                  <div className="api-view-mode-toggle">
                    <button
                      className={`api-view-pill ${bodyViewMode === "pretty" ? "active" : ""}`}
                      onClick={() => setBodyViewMode("pretty")}
                    >
                      Pretty (JSON)
                    </button>
                    <button
                      className={`api-view-pill ${bodyViewMode === "raw" ? "active" : ""}`}
                      onClick={() => setBodyViewMode("raw")}
                    >
                      Raw Text
                    </button>
                    <button
                      className={`api-view-pill ${bodyViewMode === "preview" ? "active" : ""}`}
                      onClick={() => setBodyViewMode("preview")}
                    >
                      Preview
                    </button>
                  </div>

                  <div className="api-response-search-box">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Find in response..."
                      value={responseSearchQuery}
                      onChange={(e) => setResponseSearchQuery(e.target.value)}
                      className="api-search-input"
                    />
                    {responseSearchQuery && (
                      <span className="search-count">
                        {formattedJsonLines.filter((l) => l.toLowerCase().includes(responseSearchQuery.toLowerCase())).length} matches
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-toolbar for Response Headers */}
              {responseTab === "headers" && (
                <div className="api-response-toolbar">
                  <div className="api-response-search-box full">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Filter response headers..."
                      value={headersSearchQuery}
                      onChange={(e) => setHeadersSearchQuery(e.target.value)}
                      className="api-search-input"
                    />
                  </div>
                </div>
              )}

              {/* Response Contents Area */}
              <div className="api-response-content">
                {/* 1. BODY TAB */}
                {responseTab === "body" && (
                  <>
                    {bodyViewMode === "pretty" ? (
                      <div className="api-json-viewer">
                        {formattedJsonLines.map((line, idx) => {
                          const isMatch =
                            responseSearchQuery.trim() &&
                            line.toLowerCase().includes(responseSearchQuery.toLowerCase().trim());
                          return (
                            <div key={idx} className={`api-json-line ${isMatch ? "has-search-match" : ""}`}>
                              <span className="api-json-line-num">{idx + 1}</span>
                              <span className="api-json-line-code">
                                {highlightJsonLineTokens(line)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : bodyViewMode === "raw" ? (
                      <pre className={`api-response-code ${response.isError ? "error" : ""}`}>
                        {response.rawText || "No content returned."}
                      </pre>
                    ) : (
                      /* Preview Mode (iframe / HTML) */
                      <div className="api-response-preview-box">
                        <iframe
                          title="Response Preview"
                          className="api-response-iframe"
                          sandbox="allow-same-origin"
                          srcDoc={response.rawText || "<html><body>No preview available</body></html>"}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* 2. HEADERS TAB */}
                {responseTab === "headers" && (
                  <div className="api-response-headers-table">
                    {filteredHeaders.length === 0 ? (
                      <div className="api-empty-state">No headers matched your search.</div>
                    ) : (
                      <table className="api-table">
                        <thead>
                          <tr>
                            <th>Header</th>
                            <th>Value</th>
                            <th style={{ width: 80 }}>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHeaders.map(([k, v]) => {
                            const lk = k.toLowerCase();
                            let badge = null;
                            if (lk.includes("security") || lk === "strict-transport-security") badge = "HSTS";
                            else if (lk.includes("content-security-policy")) badge = "CSP";
                            else if (lk.includes("access-control")) badge = "CORS";
                            else if (lk.includes("content-type")) badge = "Format";
                            else if (lk.includes("rate-limit") || lk.includes("ratelimit")) badge = "RateLimit";
                            else if (lk.includes("cache")) badge = "Cache";

                            return (
                              <tr key={k}>
                                <td className="api-table-key">{k}</td>
                                <td className="api-table-val">{String(v)}</td>
                                <td>
                                  {badge && <span className="api-header-tag">{badge}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 3. AI INSIGHTS & SECURITY TAB - PROPERLY FORMATTED WITH REACT-MARKDOWN */}
                {responseTab === "ai" && (
                  <div className="api-ai-panel">
                    <div className="api-ai-card-header">
                      <div className="api-ai-badge">
                        <VscSparkle /> Cypher API Insights & Security Audit
                      </div>
                      {aiAnalysis && (
                        <div className="api-ai-card-actions">
                          <button
                            className="api-btn-xs"
                            onClick={handleCopyAiAnalysis}
                            title="Copy analysis report"
                          >
                            {copiedAiAnalysis ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}{" "}
                            {copiedAiAnalysis ? "Copied" : "Copy Report"}
                          </button>
                        </div>
                      )}
                    </div>

                    {aiLoading ? (
                      <div className="api-ai-loading">
                        <VscRefresh className="api-spin" /> Local Qwen / Cypher AI analyzing API response & security profile...
                      </div>
                    ) : aiError ? (
                      <div className="api-ai-error">{aiError}</div>
                    ) : aiAnalysis ? (
                      <div className="api-ai-markdown-rendered">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="ai-md-h1">{children}</h1>,
                            h2: ({ children }) => <h2 className="ai-md-h2">{children}</h2>,
                            h3: ({ children }) => <h3 className="ai-md-h3">{children}</h3>,
                            h4: ({ children }) => <h4 className="ai-md-h4">{children}</h4>,
                            p: ({ children }) => <p className="ai-md-p">{children}</p>,
                            ul: ({ children }) => <ul className="ai-md-ul">{children}</ul>,
                            ol: ({ children }) => <ol className="ai-md-ol">{children}</ol>,
                            li: ({ children }) => <li className="ai-md-li">{children}</li>,
                            hr: () => <hr className="ai-md-hr" />,
                            blockquote: ({ children }) => <blockquote className="ai-md-quote">{children}</blockquote>,
                            strong: ({ children }) => <strong className="ai-md-strong">{children}</strong>,
                            code: ({ inline, className, children, ...props }) => {
                              if (inline) {
                                return (
                                  <code className="ai-md-inline-code" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <div className="ai-md-code-card">
                                  <pre className="ai-md-pre">
                                    <code className="ai-md-code-block" {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              );
                            }
                          }}
                        >
                          {aiAnalysis}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="api-empty-state">
                        Click "AI Analyze" or "Security Audit" above to inspect this production or local API response.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="api-response-placeholder">
              <GiCurledTentacle className="api-placeholder-icon" />
              <h3>Production & Localhost API Tester</h3>
              <p>
                Test production HTTPS backend endpoints or local microservices with CORS-bypassing proxy, cURL generation, and AI diagnostics.
              </p>
              <div className="api-hint-box">
                <strong>🚀 Production Testing:</strong> Switch Environment to <code>Production</code> or paste any remote HTTPS endpoint (e.g. <code>https://api.domain.com</code>). The proxy will execute the cURL request without CORS blocks!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Environment & Variables Configuration Modal */}
      {isEnvModalOpen && (
        <div className="api-modal-backdrop" onClick={() => setIsEnvModalOpen(false)}>
          <div className="api-modal-card env-modal" onClick={(e) => e.stopPropagation()}>
            <div className="api-modal-header">
              <h3>
                <FaCog /> Environment & Variables Manager
              </h3>
              <button className="api-btn-icon" onClick={() => setIsEnvModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="api-modal-body">
              <p>Configure production base URLs and auth tokens for seamless environment switching:</p>

              <div className="api-env-form-group">
                <label>Production Base URL (<code>&#123;&#123;baseUrl&#125;&#125;</code> in Prod):</label>
                <input
                  type="text"
                  className="api-input"
                  placeholder="https://api.yourproject.com"
                  value={envConfig.productionBase}
                  onChange={(e) => setEnvConfig({ ...envConfig, productionBase: e.target.value })}
                />
              </div>

              <div className="api-env-form-group">
                <label>Production Bearer Token (<code>&#123;&#123;token&#125;&#125;</code> in Prod):</label>
                <input
                  type="text"
                  className="api-input"
                  placeholder="prod_secret_token_xyz"
                  value={envConfig.prodToken}
                  onChange={(e) => setEnvConfig({ ...envConfig, prodToken: e.target.value })}
                />
              </div>

              <div className="api-env-form-group">
                <label>Production API Key (<code>&#123;&#123;apiKey&#125;&#125;</code> in Prod):</label>
                <input
                  type="text"
                  className="api-input"
                  placeholder="live_api_key_12345"
                  value={envConfig.prodApiKey}
                  onChange={(e) => setEnvConfig({ ...envConfig, prodApiKey: e.target.value })}
                />
              </div>

              <div className="api-env-form-group">
                <label>Staging Base URL:</label>
                <input
                  type="text"
                  className="api-input"
                  placeholder="https://staging-api.yourproject.com"
                  value={envConfig.stagingBase}
                  onChange={(e) => setEnvConfig({ ...envConfig, stagingBase: e.target.value })}
                />
              </div>

              <div className="api-env-form-row">
                <div className="api-env-form-group half">
                  <label>Request Timeout (Seconds):</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    className="api-input"
                    value={envConfig.timeoutSec}
                    onChange={(e) => setEnvConfig({ ...envConfig, timeoutSec: Number(e.target.value) || 30 })}
                  />
                </div>
                <div className="api-env-form-group half checkbox-group">
                  <label className="api-checkbox-label">
                    <input
                      type="checkbox"
                      checked={envConfig.insecureSsl}
                      onChange={(e) => setEnvConfig({ ...envConfig, insecureSsl: e.target.checked })}
                    />
                    Allow Insecure SSL (<code>-k</code> / self-signed certs)
                  </label>
                </div>
              </div>
            </div>

            <div className="api-modal-footer">
              <button className="api-btn-primary" onClick={() => setIsEnvModalOpen(false)}>
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import cURL Modal */}
      {isImportOpen && (
        <div className="api-modal-backdrop" onClick={() => setIsImportOpen(false)}>
          <div className="api-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="api-modal-header">
              <h3>
                <FaTerminal /> Import cURL Command
              </h3>
              <button className="api-btn-icon" onClick={() => setIsImportOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="api-modal-body">
              <p>Paste any production or localhost <code>curl</code> command below from Chrome DevTools or docs:</p>
              <textarea
                className="api-modal-textarea"
                rows={6}
                value={importCurlText}
                onChange={(e) => setImportCurlText(e.target.value)}
                placeholder='curl -X POST "https://api.github.com/user/repos" -H "Authorization: Bearer ghp_xxx" -d "{\"name\":\"new-repo\"}"'
              />
              {importError && <div className="api-modal-error">{importError}</div>}
            </div>

            <div className="api-modal-footer">
              <button className="api-btn-secondary" onClick={() => setIsImportOpen(false)}>
                Cancel
              </button>
              <button className="api-btn-primary" onClick={handleImportCurl}>
                Parse & Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
