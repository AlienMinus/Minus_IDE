// src/services/architectureScanner.js
// Multi-layer AST & static analysis scanner for Hyperion WebIDE

/**
 * Excludes third-party packages, caches, compiled build outputs, and minified bundles
 */
export function isIgnoredPath(filePath = "", fileName = "") {
  const fullPath = ((filePath || "") + "/" + (fileName || "")).toLowerCase().replace(/\\/g, "/");
  const segments = fullPath.split("/").filter(Boolean);

  const ignoredNames = new Set([
    "node_modules",
    "dist",
    "build",
    "out",
    ".cache",
    "cache",
    ".next",
    ".vite",
    ".git",
    ".turbo",
    "coverage",
    ".nyc_output",
    "temp",
    "tmp",
    "vendor",
    "public"
  ]);

  for (const seg of segments) {
    if (ignoredNames.has(seg)) {
      return true;
    }
  }

  if (
    fullPath.endsWith(".min.js") ||
    fullPath.endsWith(".bundle.js") ||
    fullPath.endsWith(".map") ||
    fullPath.includes(".chunk.")
  ) {
    return true;
  }

  return false;
}

/**
 * Categorizes a file into architectural layers based on its path, imports, and content.
 */
export function categorizeFile(file) {
  if (isIgnoredPath(file.path, file.name)) {
    return "ignored";
  }

  const path = (file.path || file.name || "").toLowerCase();
  const name = file.name || "";
  const content = file.content || "";

  // 1. Database Models / Schemas
  if (
    path.includes("/models/") ||
    path.includes("/schemas/") ||
    path.includes("\\models\\") ||
    path.includes("\\schemas\\") ||
    /model\.(js|ts)$/i.test(name) ||
    /schema\.(js|ts)$/i.test(name) ||
    content.includes("mongoose.Schema") ||
    content.includes("new Schema(") ||
    content.includes("@prisma/client")
  ) {
    return "model";
  }

  // 2. React Context & State Stores
  if (
    path.includes("/context/") ||
    path.includes("\\context\\") ||
    /context\.(js|jsx|ts|tsx)$/i.test(name) ||
    content.includes("createContext(") ||
    content.includes("createSlice(")
  ) {
    return "context";
  }

  // 3. Custom Hooks
  if (
    path.includes("/hooks/") ||
    path.includes("\\hooks\\") ||
    /^use[A-Z0-9].*\.(js|jsx|ts|tsx)$/.test(name)
  ) {
    return "hook";
  }

  // 4. API Services & HTTP Clients
  if (
    path.includes("/services/") ||
    path.includes("\\services\\") ||
    path.includes("/api/") ||
    path.includes("\\api\\") ||
    /api\.(js|ts)$/i.test(name) ||
    content.includes("fetchWithTimeout") ||
    (content.includes("fetch(") && content.includes("http")) ||
    content.includes("axios.")
  ) {
    return "service";
  }

  // 5. Backend Server, Routes & Controllers
  if (
    name === "server.js" ||
    name === "app.js" ||
    path.includes("/routes/") ||
    path.includes("\\routes\\") ||
    path.includes("/controllers/") ||
    path.includes("\\controllers\\") ||
    content.includes("express.Router()") ||
    content.includes("app.get(") ||
    content.includes("app.post(")
  ) {
    return "backend";
  }

  // 6. Pages / Views
  if (
    path.includes("/pages/") ||
    path.includes("\\pages\\") ||
    path.includes("/views/") ||
    path.includes("\\views\\")
  ) {
    return "page";
  }

  // 7. React UI Components
  if (
    path.includes("/components/") ||
    path.includes("\\components\\") ||
    /\.(jsx|tsx)$/i.test(name) ||
    content.includes("return (") ||
    content.includes("return <")
  ) {
    return "component";
  }

  // 8. Utilities & Helpers
  if (
    path.includes("/utils/") ||
    path.includes("\\utils\\") ||
    path.includes("/helpers/") ||
    path.includes("\\helpers\\") ||
    /util(s)?\.(js|ts)$/i.test(name)
  ) {
    return "util";
  }

  return "other";
}

/**
 * Extracts schema fields and relations from Mongoose/Prisma/SQL schemas
 */
function extractModelDetails(content) {
  const fields = [];
  const relations = [];

  // Mongoose schema fields: fieldName: { type: String, ref: 'User', required: true }
  const fieldRegex = /([a-zA-Z0-9_]+)\s*:\s*\{\s*type\s*:\s*([a-zA-Z0-9_.]+)(?:[^{}]*?ref\s*:\s*['"]([a-zA-Z0-9_]+)['"])?/g;
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    const refTarget = match[3];

    fields.push({
      name: fieldName,
      type: fieldType,
      ref: refTarget || null,
      required: match[0].includes("required: true")
    });

    if (refTarget) {
      relations.push({
        targetModel: refTarget,
        field: fieldName,
        kind: "one-to-many"
      });
    }
  }

  // Simple key-value mongoose fields: fieldName: String
  const simpleFieldRegex = /([a-zA-Z0-9_]+)\s*:\s*(String|Number|Boolean|Date|Buffer|ObjectId|Array)/g;
  while ((match = simpleFieldRegex.exec(content)) !== null) {
    if (!fields.some(f => f.name === match[1])) {
      fields.push({
        name: match[1],
        type: match[2],
        required: false
      });
    }
  }

  // Extract hooks and statics/methods
  const methods = [];
  const hookRegex = /\.pre\(['"]([a-zA-Z0-9_]+)['"]|\.post\(['"]([a-zA-Z0-9_]+)['"]|\.methods\.([a-zA-Z0-9_]+)|\.statics\.([a-zA-Z0-9_]+)/g;
  while ((match = hookRegex.exec(content)) !== null) {
    const m = match[1] || match[2] || match[3] || match[4];
    if (m && !methods.includes(m)) methods.push(m);
  }

  return { fields, relations, methods };
}

/**
 * Extracts state, effects, props, and functions from React components
 */
function extractComponentDetails(content) {
  const stateVars = [];
  const functions = [];
  const hooksUsed = [];
  const childComponents = [];

  // useState variables: const [data, setData] = useState(...)
  const useStateRegex = /const\s*\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]\s*=\s*useState(?:\s*<[^>]+>)?\s*\(([^)]*)\)/g;
  let match;
  while ((match = useStateRegex.exec(content)) !== null) {
    stateVars.push({
      state: match[1],
      setter: match[2],
      initial: match[3]?.trim() || "undefined"
    });
  }

  // React hooks used
  const hookRegex = /\b(useEffect|useMemo|useCallback|useRef|useContext|useReducer|useNavigate|useParams)\b/g;
  while ((match = hookRegex.exec(content)) !== null) {
    if (!hooksUsed.includes(match[1])) hooksUsed.push(match[1]);
  }

  // Internal and exported functions
  const funcRegex = /(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (name && !["useState", "useEffect", "useRef", "useMemo"].includes(name) && !functions.includes(name)) {
      functions.push(name);
    }
  }

  // JSX child components rendered: <AdminHero ... />
  const jsxRegex = /<([A-Z][a-zA-Z0-9_]+)(?:\s|\/|>)/g;
  while ((match = jsxRegex.exec(content)) !== null) {
    const comp = match[1];
    if (!childComponents.includes(comp) && comp !== "Fragment") {
      childComponents.push(comp);
    }
  }

  return { stateVars, functions, hooksUsed, childComponents };
}

/**
 * Extracts Context Provider values, consumers, and methods
 */
function extractContextDetails(content) {
  const providedValues = [];
  const consumers = [];

  // Match: value={{ a, b, c }}
  const valueRegex = /value\s*=\s*\{\s*\{([^}]+)\}\s*\}/g;
  const match = valueRegex.exec(content);
  if (match) {
    const items = match[1].split(",").map(s => s.trim().replace(/^\.\.\./, '')).filter(Boolean);
    providedValues.push(...items);
  }

  return { providedValues, consumers };
}

/**
 * Extracts API routes, fetch functions, and endpoints from backend & service files
 */
function extractApiDetails(content) {
  const endpoints = [];
  const apiFunctions = [];

  // Express endpoints: app.get('/api/...', ...) or router.post(...)
  const expressRegex = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = expressRegex.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }

  // Fetch or axios requests: fetch(`${API_BASE_URL}/portfolio-data`)
  const fetchRegex = /(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g;
  while ((match = fetchRegex.exec(content)) !== null) {
    const ep = match[1] || match[2] || match[3];
    if (ep) {
      endpoints.push({
        method: match[0].includes("post") ? "POST" : "GET",
        path: ep.replace(/\${[^}]+}/g, '')
      });
    }
  }

  // Exported async service functions: export async function getPortfolioData()
  const serviceFuncRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)|export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/g;
  while ((match = serviceFuncRegex.exec(content)) !== null) {
    const fn = match[1] || match[2];
    if (fn && !apiFunctions.includes(fn)) apiFunctions.push(fn);
  }

  return { endpoints, apiFunctions };
}

/**
 * Extract imported identifiers and file targets
 */
function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:(\{[^}]+\})|([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const named = match[1];
    const defaultImport = match[2];
    const source = match[3];
    imports.push({
      symbols: named ? named.replace(/[{}]/g, '').split(',').map(s => s.trim()) : [defaultImport],
      source
    });
  }

  // CommonJS require
  const requireRegex = /(?:const|let|var)\s+(?:(\{[^}]+\})|([a-zA-Z0-9_]+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    const named = match[1];
    const defaultImport = match[2];
    const source = match[3];
    imports.push({
      symbols: named ? named.replace(/[{}]/g, '').split(',').map(s => s.trim()) : [defaultImport],
      source
    });
  }

  return imports;
}

/**
 * Full Workspace Scanner:
 * Parses all workspace files and produces a comprehensive Architectural Graph.
 */
export function scanCodebaseArchitecture(files = []) {
  const nodes = [];
  const edges = [];
  const fileMap = new Map();

  const codeFiles = files.filter(f => {
    if (!f || !f.name) return false;
    if (isIgnoredPath(f.path, f.name)) return false;
    const n = f.name.toLowerCase();
    return (
      (n.endsWith(".js") || n.endsWith(".jsx") || n.endsWith(".ts") || n.endsWith(".tsx")) &&
      !n.includes("test") &&
      !n.includes("spec") &&
      !n.endsWith(".config.js") &&
      !n.endsWith(".d.ts")
    );
  });

  codeFiles.forEach(file => {
    const layer = categorizeFile(file);
    const content = file.content || "";
    const name = file.name.replace(/\.[^/.]+$/, "");
    const imports = extractImports(content);

    let details = {};
    if (layer === "model") {
      details = extractModelDetails(content);
    } else if (layer === "component" || layer === "page") {
      details = extractComponentDetails(content);
    } else if (layer === "context") {
      details = {
        ...extractContextDetails(content),
        ...extractComponentDetails(content)
      };
    } else if (layer === "service" || layer === "backend") {
      details = extractApiDetails(content);
    } else {
      details = extractComponentDetails(content);
    }

    const node = {
      id: `${layer}-${name}`,
      name,
      fileName: file.name,
      filePath: file.path || file.name,
      layer,
      imports,
      details,
      lineCount: (content.match(/\n/g) || []).length + 1
    };

    nodes.push(node);
    fileMap.set(name.toLowerCase(), node);
    fileMap.set(file.name.toLowerCase(), node);
  });

  // Build architectural connections (edges)
  nodes.forEach(sourceNode => {
    // 1. Connection via Imports
    sourceNode.imports.forEach(imp => {
      const sourceBasename = imp.source.split("/").pop()?.replace(/\.[^/.]+$/, "").toLowerCase();
      if (sourceBasename && fileMap.has(sourceBasename)) {
        const targetNode = fileMap.get(sourceBasename);
        if (targetNode && targetNode.id !== sourceNode.id) {
          edges.push({
            id: `${sourceNode.id}->${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            label: `imports ${imp.symbols.slice(0, 2).join(", ")}`,
            kind: "import"
          });
        }
      }
    });

    // 2. Connection via JSX Child Rendering
    if (sourceNode.details.childComponents) {
      sourceNode.details.childComponents.forEach(child => {
        const childNode = fileMap.get(child.toLowerCase());
        if (childNode && childNode.id !== sourceNode.id) {
          if (!edges.some(e => e.source === sourceNode.id && e.target === childNode.id)) {
            edges.push({
              id: `${sourceNode.id}->${childNode.id}-render`,
              source: sourceNode.id,
              target: childNode.id,
              label: "renders",
              kind: "render"
            });
          }
        }
      });
    }

    // 3. Connection via Model Relations (Foreign Keys)
    if (sourceNode.details.relations) {
      sourceNode.details.relations.forEach(rel => {
        const targetModelNode = fileMap.get(rel.targetModel.toLowerCase());
        if (targetModelNode) {
          edges.push({
            id: `${sourceNode.id}->${targetModelNode.id}-relation`,
            source: sourceNode.id,
            target: targetModelNode.id,
            label: `references (${rel.field})`,
            kind: "relation"
          });
        }
      });
    }
  });

  return {
    nodes,
    edges,
    stats: {
      totalFiles: nodes.length,
      models: nodes.filter(n => n.layer === "model").length,
      pages: nodes.filter(n => n.layer === "page").length,
      components: nodes.filter(n => n.layer === "component").length,
      contexts: nodes.filter(n => n.layer === "context").length,
      hooks: nodes.filter(n => n.layer === "hook").length,
      services: nodes.filter(n => n.layer === "service").length,
      backend: nodes.filter(n => n.layer === "backend").length,
      utils: nodes.filter(n => n.layer === "util").length
    }
  };
}

