// src/services/architectureScanner.js
// Multi-layer AST & static analysis scanner for Hyperion WebIDE
import { parseMongooseFile } from "./mongoSchemaParser.js";

/**
 * Excludes third-party packages, caches, compiled build outputs, and minified bundles.
 * Notice: 'public' is explicitly NOT ignored.
 */
export function isIgnoredPath(filePath = "", fileName = "") {
  const full = ((filePath || "") + "/" + (fileName || "")).toLowerCase().replace(/\\/g, "/");

  // Explicitly ignore node_modules, build outputs, version control, and temporary caches
  if (
    full.includes("/node_modules/") ||
    full.includes("node_modules/") ||
    full.startsWith("node_modules/") ||
    full.includes("/dist/") ||
    full.includes("dist/") ||
    full.startsWith("dist/") ||
    full.includes("/build/") ||
    full.includes("build/") ||
    full.startsWith("build/") ||
    full.includes("/out/") ||
    full.includes("out/") ||
    full.includes("/.cache/") ||
    full.includes(".cache/") ||
    full.includes("/cache/") ||
    full.includes("/.next/") ||
    full.includes(".next/") ||
    full.includes("/.vite/") ||
    full.includes(".vite/") ||
    full.includes("/.git/") ||
    full.includes(".git/") ||
    full.includes("/.turbo/") ||
    full.includes(".turbo/") ||
    full.includes("/coverage/") ||
    full.includes("/.nyc_output/") ||
    full.includes("/temp/") ||
    full.includes("/tmp/") ||
    full.includes("/vendor/")
  ) {
    return true;
  }

  // Minified bundles, vendor chunks, and source maps
  if (
    full.endsWith(".min.js") ||
    full.endsWith(".bundle.js") ||
    full.endsWith(".map") ||
    full.includes(".chunk.")
  ) {
    return true;
  }

  // Binary media assets, audio, images, fonts, documents, and package lockfiles
  if (
    /\.(png|jpe?g|gif|webp|ico|svg|mp3|wav|ogg|mp4|webm|pdf|ttf|otf|woff2?|eot|lock)$/i.test(full) ||
    full.endsWith("package-lock.json") ||
    full.endsWith("yarn.lock") ||
    full.endsWith("pnpm-lock.yaml") ||
    /\.(md|markdown|txt|license)$/i.test(full)
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

  const path = (file.path || file.name || "").toLowerCase().replace(/\\/g, "/");
  const name = file.name || "";
  const content = file.content || "";

  // 1. Config & Environment Files (check first to avoid classifying package.json / .env as backend)
  if (
    name === "package.json" ||
    name.endsWith(".config.js") ||
    name.endsWith(".config.ts") ||
    name.endsWith(".config.mjs") ||
    name.startsWith(".env") ||
    path.includes("/config/") ||
    path.startsWith("config/") ||
    path.includes("/env/")
  ) {
    return "config";
  }

  // 2. Database Models / Schemas (in any folder)
  if (
    path.includes("/models/") ||
    path.includes("/schemas/") ||
    path.startsWith("models/") ||
    path.startsWith("schemas/") ||
    path.includes("/entities/") ||
    path.includes("/database/") ||
    path.includes("/db/") ||
    /model\.(js|ts|mjs|cjs)$/i.test(name) ||
    /schema\.(js|ts|mjs|cjs)$/i.test(name) ||
    /entity\.(js|ts|mjs|cjs)$/i.test(name) ||
    content.includes("mongoose.Schema") ||
    content.includes("new Schema") ||
    content.includes("mongoose.model") ||
    content.includes(".model(") ||
    content.includes("@prisma/client") ||
    content.includes("PrismaClient") ||
    content.includes("@Entity") ||
    content.includes("sequelize.define")
  ) {
    return "model";
  }

  // 3. API Services & Network Clients (check before backend so frontend services aren't miscategorized)
  if (
    path.includes("/services/") ||
    path.startsWith("services/") ||
    path.includes("/client/") ||
    path.startsWith("client/") ||
    path.includes("/fetcher/") ||
    path.includes("/api-client/") ||
    (/api\.(js|ts)$/i.test(name) && (path.includes("src/") || path.includes("client/"))) ||
    /service\.(js|ts)$/i.test(name) ||
    content.includes("fetchWithTimeout") ||
    (content.includes("fetch(") && content.includes("http")) ||
    content.includes("axios.")
  ) {
    return "service";
  }

  // 4. Backend Server, Routes, APIs, Routers, Controllers & Middleware (in backend/server folders)
  const isFrontendPath = path.startsWith("src/") || path.startsWith("client/");
  const isBackendLocation =
    !isFrontendPath &&
    (path.startsWith("server/") ||
      path.includes("/server/") ||
      path.startsWith("backend/") ||
      path.includes("/backend/") ||
      path.includes("/routes/") ||
      path.startsWith("routes/") ||
      path.includes("/controllers/") ||
      path.startsWith("controllers/") ||
      path.includes("/handlers/") ||
      path.startsWith("handlers/") ||
      path.includes("/endpoints/") ||
      path.startsWith("endpoints/") ||
      path.includes("/api/") ||
      path.startsWith("api/") ||
      path.includes("/api-routes/") ||
      path.includes("/middleware/") ||
      path.includes("/middlewares/") ||
      name === "server.js" ||
      name === "app.js");

  const hasExpressServerCode =
    !isFrontendPath &&
    (content.includes("express(") ||
      content.includes("express.Router") ||
      content.includes('require("express")') ||
      content.includes("require('express')") ||
      content.includes('from "express"') ||
      content.includes("from 'express'") ||
      content.includes("app.listen(") ||
      content.includes("app.get(") ||
      content.includes("app.post(") ||
      content.includes("app.put(") ||
      content.includes("app.delete(") ||
      content.includes("app.patch(") ||
      content.includes("app.use(") ||
      content.includes("router.get(") ||
      content.includes("router.post(") ||
      content.includes("router.put(") ||
      content.includes("router.delete(") ||
      content.includes("router.patch("));

  if (isBackendLocation || hasExpressServerCode) {
    // Ensure it's not a frontend React component or context
    const isFrontendReact =
      content.includes("createContext(") ||
      (content.includes("return (") && (content.includes("</div>") || content.includes("</button>")));

    if (!isFrontendReact) {
      return "backend";
    }
  }

  // 3. React Context & State Stores (in any folder)
  if (
    path.includes("/context/") ||
    path.startsWith("context/") ||
    path.includes("/store/") ||
    path.startsWith("store/") ||
    path.includes("/state/") ||
    path.includes("/slices/") ||
    path.includes("/reducers/") ||
    /context\.(js|jsx|ts|tsx)$/i.test(name) ||
    /store\.(js|jsx|ts|tsx)$/i.test(name) ||
    content.includes("createContext(") ||
    content.includes("createSlice(") ||
    content.includes("createStore(") ||
    content.includes("defineStore(") ||
    content.includes("atom(")
  ) {
    return "context";
  }

  // 4. Custom Hooks (in any folder)
  if (
    path.includes("/hooks/") ||
    path.startsWith("hooks/") ||
    /^use[A-Z0-9].*\.(js|jsx|ts|tsx)$/.test(name)
  ) {
    return "hook";
  }

  // 5. API Services & Network Clients (in any folder)
  if (
    path.includes("/services/") ||
    path.startsWith("services/") ||
    path.includes("/client/") ||
    path.startsWith("client/") ||
    path.includes("/fetcher/") ||
    /api\.(js|ts)$/i.test(name) ||
    /service\.(js|ts)$/i.test(name) ||
    content.includes("fetchWithTimeout") ||
    (content.includes("fetch(") && content.includes("http")) ||
    content.includes("axios.")
  ) {
    return "service";
  }

  // 6. Pages / Views (in any folder)
  if (
    path.includes("/pages/") ||
    path.startsWith("pages/") ||
    path.includes("/views/") ||
    path.startsWith("views/") ||
    path.includes("/screens/") ||
    path.startsWith("screens/") ||
    /page\.(jsx|tsx|js)$/i.test(name) ||
    /view\.(jsx|tsx|js)$/i.test(name)
  ) {
    return "page";
  }

  // 7. React UI Components & Widgets (in any folder)
  if (
    path.includes("/components/") ||
    path.startsWith("components/") ||
    path.includes("/widgets/") ||
    path.includes("/ui/") ||
    /\.(jsx|tsx)$/i.test(name) ||
    content.includes("return (") ||
    content.includes("return <")
  ) {
    return "component";
  }

  // 8. Configuration & Environment (in any folder)
  if (
    path.includes("/config/") ||
    path.startsWith("config/") ||
    path.includes("/env/") ||
    /config\.(js|ts|json)$/i.test(name) ||
    name.endsWith(".config.js") ||
    name.endsWith(".config.ts") ||
    name === "package.json"
  ) {
    return "config";
  }

  // 9. Utilities, Helpers & Core Modules (all other folders across the entire workspace)
  return "util";
}

/**
 * Extracts schema fields, types, and relations from Mongoose/Prisma models
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

  // Sub-schemas defined in the model file (e.g. const educationSchema = new mongoose.Schema({...}))
  const subSchemas = [];
  const subSchemaRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+Schema)\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*(?:,|\))/g;
  let sMatch;
  while ((sMatch = subSchemaRegex.exec(content)) !== null) {
    const sName = sMatch[1];
    const sBody = sMatch[2];
    const sFields = [];
    const sfRegex = /([a-zA-Z0-9_]+)\s*:\s*(?:\{\s*type\s*:\s*([a-zA-Z0-9_.]+)|(String|Number|Boolean|Date|ObjectId))/g;
    let sfm;
    while ((sfm = sfRegex.exec(sBody)) !== null) {
      sFields.push({ name: sfm[1], type: sfm[2] || sfm[3] });
    }
    subSchemas.push({ name: sName, fields: sFields });
  }

  // Schema hooks & methods
  const methods = [];
  const hookRegex = /\.pre\(['"]([a-zA-Z0-9_]+)['"]|\.post\(['"]([a-zA-Z0-9_]+)['"]|\.methods\.([a-zA-Z0-9_]+)|\.statics\.([a-zA-Z0-9_]+)/g;
  while ((match = hookRegex.exec(content)) !== null) {
    const m = match[1] || match[2] || match[3] || match[4];
    if (m && !methods.includes(m)) methods.push(m);
  }

  return { fields, relations, methods, subSchemas };
}

/**
 * Extracts backend server routes, methods, controllers, and database interactions
 */
function extractBackendDetails(content) {
  const endpoints = [];
  const queriedModels = new Set();
  const middleware = [];

  // Extract Express routes: app.get("/api/portfolio-data", async (req, res) => ...)
  // router.post("/contact", ...)
  const routeRegex = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]([\s\S]*?)(?=(?:(?:app|router)\.(?:get|post|put|delete|patch)\s*\()|$)/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const handlerBlock = match[3] || "";

    // Detect models queried in this handler block (e.g. Hero.findOne(), Project.find())
    const modelCallRegex = /\b([A-Z][a-zA-Z0-9_]+)\.(find|findOne|findById|create|updateOne|updateMany|deleteOne|deleteMany|save|aggregate)\b/g;
    let mMatch;
    const modelsInRoute = [];
    while ((mMatch = modelCallRegex.exec(handlerBlock)) !== null) {
      const modelName = mMatch[1];
      if (!["Promise", "Object", "Array", "JSON", "Date", "Math"].includes(modelName)) {
        modelsInRoute.push(modelName);
        queriedModels.add(modelName);
      }
    }

    endpoints.push({
      method,
      path: routePath,
      models: [...new Set(modelsInRoute)],
      isProtected: handlerBlock.includes("admin") || handlerBlock.includes("auth") || handlerBlock.includes("x-admin-password")
    });
  }

  // Check server configuration & middleware
  if (content.includes("cors(")) middleware.push("cors");
  if (content.includes("express.json(")) middleware.push("express.json");
  if (content.includes("dotenv")) middleware.push("dotenv");
  if (content.includes("mongoose.connect")) middleware.push("mongoose");

  // Extract port
  let port = "5000";
  const portMatch = content.match(/PORT\s*=\s*(?:process\.env\.PORT\s*\|\|\s*)?(\d{2,5})/i);
  if (portMatch) {
    port = portMatch[1];
  }

  return {
    endpoints,
    queriedModels: Array.from(queriedModels),
    middleware,
    port
  };
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

  // Functions & Handlers
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
  const valueRegex = /value\s*=\s*\{\s*\{([^}]+)\}\s*\}/g;
  const match = valueRegex.exec(content);
  if (match) {
    const items = match[1].split(",").map(s => s.trim().replace(/^\.\.\./, '')).filter(Boolean);
    providedValues.push(...items);
  }

  return { providedValues };
}

/**
 * Extracts API services and network endpoints
 */
function extractServiceDetails(content) {
  const endpoints = [];
  const apiFunctions = [];

  // Fetch or axios calls: fetch(`${API_BASE_URL}/portfolio-data`)
  const fetchRegex = /(?:fetchWithTimeout|fetch|axios\.(?:get|post|put|delete))\s*\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g;
  let match;
  while ((match = fetchRegex.exec(content)) !== null) {
    const ep = match[1] || match[2] || match[3];
    if (ep) {
      endpoints.push({
        method: match[0].includes("post") ? "POST" : "GET",
        path: ep.replace(/\${[^}]+}/g, "")
      });
    }
  }

  // Exported service functions: export async function getPortfolioData()
  const serviceFuncRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)|export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/g;
  while ((match = serviceFuncRegex.exec(content)) !== null) {
    const fn = match[1] || match[2];
    if (fn && !apiFunctions.includes(fn)) apiFunctions.push(fn);
  }

  return { endpoints, apiFunctions };
}

/**
 * Extracts ALL declared variables, constants, instances, refs, schemas, and concepts without ignoring any
 */
export function extractAllDeclarations(content = "") {
  const items = [];
  const seenNames = new Set();

  // 1. Destructured React State: const [data, setData] = useState(...)
  const destructuredStateRegex = /(?:const|let|var)\s*\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]\s*=\s*(useState|useReducer)\s*\(([^)]*)\)/g;
  let match;
  while ((match = destructuredStateRegex.exec(content)) !== null) {
    const stateName = match[1];
    const setterName = match[2];
    const kind = match[3];
    const init = match[4]?.trim() || "undefined";
    if (!seenNames.has(stateName)) {
      seenNames.add(stateName);
      items.push({
        name: stateName,
        kind: "state",
        type: `React ${kind}`,
        value: `setter: ${setterName}(), initial: ${init.slice(0, 30)}`
      });
    }
  }

  // 2. Destructured Objects / Arrays: const { openFolder } = useFile()
  const destructuredObjRegex = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*([^;\n]+)/g;
  while ((match = destructuredObjRegex.exec(content)) !== null) {
    const vars = match[1].split(",").map(v => v.trim().split(":")[0].trim()).filter(Boolean);
    const source = match[2].trim().slice(0, 35);
    vars.forEach(v => {
      if (!seenNames.has(v) && /^[a-zA-Z0-9_]+$/.test(v)) {
        seenNames.add(v);
        items.push({
          name: v,
          kind: "destructured",
          type: "Destructured",
          value: `from ${source}`
        });
      }
    });
  }

  // 3. All Variable & Constant Declarations: const, let, var, export const
  const declRegex = /(?:export\s+)?(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([^;\n]+)/g;
  while ((match = declRegex.exec(content)) !== null) {
    const declKeyword = match[1];
    const name = match[2];
    let rawVal = match[3]?.trim() || "";

    if (seenNames.has(name)) continue;
    seenNames.add(name);

    let kind = "variable";
    let type = "Variable";
    let preview = rawVal.replace(/['"`]/g, "");
    if (preview.length > 40) {
      preview = preview.slice(0, 37) + "...";
    }

    // Classify semantic concept accurately:
    if (rawVal.includes("express(") || rawVal.includes("express.Router(")) {
      kind = "instance";
      type = "Express App / Router Instance";
    } else if (rawVal.includes("new mongoose.Schema") || rawVal.includes("new Schema(")) {
      kind = "schema";
      type = "Mongoose Database Schema";
    } else if (rawVal.includes("mongoose.model(") || rawVal.includes(".model(")) {
      kind = "model";
      type = "Mongoose Model Class";
    } else if (rawVal.startsWith("new ")) {
      kind = "instance";
      const className = rawVal.match(/new\s+([a-zA-Z0-9_]+)/)?.[1] || "Class";
      type = `Instance of ${className}`;
    } else if (rawVal.includes("useRef(")) {
      kind = "ref";
      type = "React Mutable Ref (useRef)";
    } else if (rawVal.includes("useMemo(")) {
      kind = "memo";
      type = "React useMemo";
    } else if (rawVal.includes("useCallback(")) {
      kind = "callback";
      type = "React useCallback";
    } else if (rawVal.includes("useContext(")) {
      kind = "context-consumer";
      type = "React useContext";
    } else if (rawVal.startsWith("require(") || rawVal.includes("require(")) {
      kind = "import";
      type = "CommonJS Require";
    } else if (rawVal.includes("=>") || rawVal.startsWith("(") || rawVal.startsWith("async") || rawVal.startsWith("function")) {
      // Distinctly classify arrow functions and asynchronous handlers
      kind = "arrow-function";
      type = "Arrow Function";
    } else if (rawVal.includes("process.env.") || rawVal.includes("import.meta.env.")) {
      kind = "constant";
      type = "Environment Variable / Secret";
    } else if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
      kind = "constant";
      type = "Number Constant";
    } else if (rawVal === "true" || rawVal === "false") {
      kind = "constant";
      type = "Boolean Constant";
    } else if (rawVal.startsWith("{")) {
      kind = "constant";
      type = "Object Constant";
    } else if (rawVal.startsWith("[")) {
      kind = "constant";
      type = "Array Constant";
    } else if (declKeyword === "const") {
      kind = "constant";
      type = /^[A-Z0-9_]+$/.test(name) ? "Named Constant" : "Constant Value";
    }

    items.push({
      name,
      kind,
      type,
      value: preview,
      isConst: declKeyword === "const",
      isArrowFunction: kind === "arrow-function"
    });
  }

  // 4. Standalone and Exported Function Declarations
  const funcDeclRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
  while ((match = funcDeclRegex.exec(content)) !== null) {
    const fnName = match[1];
    const params = match[2]?.trim() || "";
    if (!seenNames.has(fnName)) {
      seenNames.add(fnName);
      items.push({
        name: fnName,
        kind: "function",
        type: "Standard Function",
        value: `(${params})`,
        isConst: false,
        isArrowFunction: false
      });
    }
  }

  return items;
}

// Retain alias for backwards compatibility
export const extractConstants = extractAllDeclarations;

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
 * Excludes node_modules, dist, and caches.
 */
export function scanCodebaseArchitecture(files = []) {
  const nodes = [];
  const edges = [];
  const fileMap = new Map();

  const codeFiles = files.filter(f => {
    if (!f || !f.name) return false;
    // Strict exclusion of node_modules and build directories
    if (isIgnoredPath(f.path, f.name)) return false;

    const n = f.name.toLowerCase();
    const ext = n.split(".").pop();
    return (
      ["js", "jsx", "ts", "tsx", "mjs", "cjs", "json"].includes(ext) &&
      !n.includes(".test.") &&
      !n.includes(".spec.") &&
      !n.endsWith(".d.ts")
    );
  });

  codeFiles.forEach(file => {
    const layer = categorizeFile(file);
    if (layer === "ignored") return;

    const content = file.content || "";
    const name = file.name.replace(/\.[^/.]+$/, "");
    const imports = extractImports(content);

    let details = {};
    if (layer === "model") {
      const parsed = parseMongooseFile(file);
      if (parsed) {
        details = {
          ...extractModelDetails(content),
          fields: parsed.fields,
          topLevelFields: parsed.topLevelFields,
          subSchemas: parsed.subSchemas,
          relations: parsed.relations,
          indexes: parsed.indexes,
          collection: parsed.collection
        };
      } else {
        details = extractModelDetails(content);
      }
    } else if (layer === "backend") {
      details = extractBackendDetails(content);
    } else if (layer === "service") {
      details = extractServiceDetails(content);
    } else if (layer === "context") {
      details = {
        ...extractContextDetails(content),
        ...extractComponentDetails(content)
      };
    } else if (layer === "component" || layer === "page") {
      details = extractComponentDetails(content);
    } else {
      details = extractComponentDetails(content);
    }

    const allDeclarations = extractAllDeclarations(content);
    details.allDeclarations = allDeclarations;
    details.arrowFunctions = allDeclarations.filter(d => d.kind === "arrow-function");
    details.constants = allDeclarations.filter(d => d.kind === "constant");
    details.instances = allDeclarations.filter(d => d.kind === "instance");
    details.schemas = allDeclarations.filter(d => d.kind === "schema");
    details.refs = allDeclarations.filter(d => d.kind === "ref");

    let nodeId = `${layer}-${name}`;
    let counter = 1;
    while (nodes.some(n => n.id === nodeId)) {
      nodeId = `${layer}-${name}_${counter++}`;
    }

    const node = {
      id: nodeId,
      fileId: file.id,
      name,
      fileName: file.name,
      filePath: file.path || file.name,
      layer,
      imports,
      details,
      lineCount: (content.match(/\n/g) || []).length + 1
    };

    nodes.push(node);
    const normPath = (file.path || file.name || "").toLowerCase().replace(/\\/g, "/");
    fileMap.set(normPath, node);
    const lowerName = name.toLowerCase();
    if (!fileMap.has(lowerName)) {
      fileMap.set(lowerName, node);
    }
    // Also track all nodes per basename in an array for layer disambiguation
    if (!fileMap.has(`_list_${lowerName}`)) {
      fileMap.set(`_list_${lowerName}`, []);
    }
    fileMap.get(`_list_${lowerName}`).push(node);
  });

  // Build architectural connections (edges)
  nodes.forEach(sourceNode => {
    // 1. Connection via Imports
    sourceNode.imports.forEach(imp => {
      let targetNode = null;

      // A. Relative path resolution (e.g. ./models/Hero from server/server.js)
      if (imp.source.startsWith(".")) {
        const sourceDir = (sourceNode.filePath || "").replace(/\\/g, "/").split("/").slice(0, -1).join("/");
        const parts = (sourceDir ? sourceDir + "/" + imp.source : imp.source).split("/");
        const resolvedParts = [];
        for (const part of parts) {
          if (part === "." || part === "") continue;
          if (part === "..") resolvedParts.pop();
          else resolvedParts.push(part);
        }
        const resolvedPath = resolvedParts.join("/").toLowerCase();
        const candidates = [
          resolvedPath,
          `${resolvedPath}.js`,
          `${resolvedPath}.jsx`,
          `${resolvedPath}.ts`,
          `${resolvedPath}.tsx`,
          `${resolvedPath}/index.js`,
          `${resolvedPath}/index.jsx`,
          `${resolvedPath}/index.ts`,
          `${resolvedPath}/index.tsx`
        ];
        for (const cand of candidates) {
          if (fileMap.has(cand)) {
            targetNode = fileMap.get(cand);
            break;
          }
        }
      }

      // B. Basename resolution with subsystem/layer affinity
      if (!targetNode) {
        const sourceBasename = imp.source.split("/").pop()?.replace(/\.[^/.]+$/, "").toLowerCase();
        if (sourceBasename && fileMap.has(`_list_${sourceBasename}`)) {
          const matches = fileMap.get(`_list_${sourceBasename}`);
          if (matches.length === 1) {
            targetNode = matches[0];
          } else {
            const isBackendSource = sourceNode.layer === "backend" || sourceNode.layer === "model";
            if (isBackendSource) {
              targetNode = matches.find(m => m.layer === "model" || m.layer === "backend" || m.layer === "util") || matches[0];
            } else {
              targetNode = matches.find(m => m.layer !== "model" && m.layer !== "backend") || matches[0];
            }
          }
        } else if (sourceBasename && fileMap.has(sourceBasename)) {
          targetNode = fileMap.get(sourceBasename);
        }
      }

      if (targetNode && targetNode.id !== sourceNode.id) {
        edges.push({
          id: `${sourceNode.id}->${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          label: `imports ${imp.symbols.slice(0, 2).join(", ")}`,
          kind: "import"
        });
      }
    });

    // 2. Connection via Backend Endpoint -> Models Queried (strictly match model layer)
    if (sourceNode.layer === "backend" && sourceNode.details.queriedModels) {
      sourceNode.details.queriedModels.forEach(modelName => {
        const lowerM = modelName.toLowerCase();
        const modelNode = nodes.find(n => n.layer === "model" && (n.name.toLowerCase() === lowerM || n.fileName.toLowerCase().replace(/\.[^/.]+$/, "") === lowerM));
        if (modelNode) {
          edges.push({
            id: `${sourceNode.id}->${modelNode.id}-query`,
            source: sourceNode.id,
            target: modelNode.id,
            label: `queries MongoDB model`,
            kind: "query"
          });
        }
      });
    }

    // 3. Connection via JSX Child Rendering
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

    // 4. Connection via Model Relations (Foreign Keys)
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
      backend: nodes.filter(n => n.layer === "backend").length,
      services: nodes.filter(n => n.layer === "service").length,
      contexts: nodes.filter(n => n.layer === "context").length,
      hooks: nodes.filter(n => n.layer === "hook").length,
      pages: nodes.filter(n => n.layer === "page").length,
      components: nodes.filter(n => n.layer === "component").length,
      utils: nodes.filter(n => n.layer === "util").length,
      configs: nodes.filter(n => n.layer === "config").length
    }
  };
}

/**
 * Detects if the workspace represents a portfolio project architecture
 */
export function isPortfolioProject(files = []) {
  if (!files || !files.length) return false;
  return files.some(f => {
    const full = (((f.path || "") + "/" + (f.name || "")).toLowerCase()).replace(/\\/g, "/");
    return (
      full.includes("portfolio") ||
      full.includes("useportfolio") ||
      f.name === "AdminPage.jsx" ||
      f.name === "AdminMessages.jsx" ||
      f.name === "ResumeEmbed.jsx" ||
      f.name === "ProjectsPage.jsx" ||
      f.name === "SkillsPage.jsx" ||
      f.name === "ExperiencePage.jsx" ||
      f.name === "rag.js"
    );
  });
}
