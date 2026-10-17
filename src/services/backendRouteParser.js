// src/services/backendRouteParser.js
// Advanced Express & Backend API Routes Parser

import { isIgnoredPath } from "./architectureScanner";

/**
 * Parses an Express server / route file content and extracts detailed route definitions,
 * handlers, queried MongoDB models, line numbers, and middleware.
 */
export function parseServerRoutes(file) {
  if (!file || !file.content) return null;
  const content = file.content;
  const fileName = file.name || "server.js";
  const filePath = file.path || fileName;

  const lines = content.split("\n");
  const endpoints = [];
  const linkedModelsSet = new Set();

  // Helper to extract models queried in a code block
  const extractModelsFromBlock = (codeBlock) => {
    const models = [];
    const modelRegex = /\b([A-Z][a-zA-Z0-9_]+)\.(find|findOne|findById|create|updateOne|updateMany|deleteOne|deleteMany|save|aggregate|countDocuments|distinct)\b/g;
    let match;
    while ((match = modelRegex.exec(codeBlock)) !== null) {
      const mName = match[1];
      if (!["Promise", "Object", "Array", "JSON", "Date", "Math", "mongoose"].includes(mName)) {
        if (!models.includes(mName)) {
          models.push(mName);
          linkedModelsSet.add(mName);
        }
      }
    }
    return models;
  };

  // 1. Detect multi-model aggregation blocks like Promise.all([ Hero.countDocuments(), ... ])
  const promiseAllRegex = /const\s*\[[^\]]+\]\s*=\s*(?:await\s*)?Promise\.all\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
  let pMatch;
  while ((pMatch = promiseAllRegex.exec(content)) !== null) {
    const block = pMatch[1];
    const models = extractModelsFromBlock(block);
    if (models.length > 0) {
      // Find line number
      const charIndex = pMatch.index;
      const lineNum = content.substring(0, charIndex).split("\n").length;

      // Format handler summary
      const firstCalls = block
        .split(",")
        .map(s => s.trim().replace(/\(\s*\)/, "(...)"))
        .filter(s => s.length > 0)
        .slice(0, 4);

      endpoints.push({
        method: "ALL",
        path: "—",
        params: "—",
        middlewares: "—",
        handler: `[${firstCalls.join(", ")}${block.split(",").length > 4 ? "..." : ""}]`,
        models,
        line: lineNum,
        isProtected: false,
        fileId: file.id,
        filePath
      });
    }
  }

  // 2. Detect Express routes: app.get("/api/portfolio-data", async (req, res) => ...)
  // app.post("/api/contact", ...)
  // router.put("/...", ...)
  const expressRouteRegex = /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([\s\S]*?)(?=(?:(?:app|router)\.(?:get|post|put|delete|patch|use)\s*\()|\n\s*app\.listen|$)/gi;
  let rMatch;
  while ((rMatch = expressRouteRegex.exec(content)) !== null) {
    const method = rMatch[1].toUpperCase();
    if (method === "USE") continue; // Skip generic middleware mount

    const routePath = rMatch[2];
    const handlerAndMiddlewares = rMatch[3] || "";

    const charIndex = rMatch.index;
    const lineNum = content.substring(0, charIndex).split("\n").length;

    // Detect handler function name or inline handler
    let handlerName = "inline handler";
    const namedHandlerMatch = handlerAndMiddlewares.match(/^([a-zA-Z0-9_]+)\s*(?:,|\)|$)/);
    if (namedHandlerMatch && !["async", "function", "req", "res"].includes(namedHandlerMatch[1])) {
      handlerName = namedHandlerMatch[1];
    }

    // Detect params in path (e.g. /api/projects/:id)
    const paramsMatch = routePath.match(/:([a-zA-Z0-9_]+)/g);
    const params = paramsMatch ? paramsMatch.join(", ") : "—";

    // Detect middleware (e.g. authMiddleware, verifyAdmin)
    const isProtected =
      handlerAndMiddlewares.includes("admin") ||
      handlerAndMiddlewares.includes("auth") ||
      handlerAndMiddlewares.includes("x-admin-password") ||
      handlerAndMiddlewares.includes("protect");

    let middlewares = "—";
    if (isProtected) {
      middlewares = "verifyAdmin";
    }

    // Extract models queried inside this route or its named handler
    let routeModels = extractModelsFromBlock(handlerAndMiddlewares);
    if (routeModels.length === 0 && handlerName !== "inline handler") {
      // Look up named handler definition in the content
      const fnRegex = new RegExp(`(?:const|function)\\s+${handlerName}[\\s\\S]*?\\{([\\s\\S]*?)\\n\\};?`);
      const fnMatch = content.match(fnRegex);
      if (fnMatch) {
        routeModels = extractModelsFromBlock(fnMatch[1]);
      }
    }

    endpoints.push({
      method,
      path: routePath,
      params,
      middlewares,
      handler: handlerName,
      models: routeModels,
      line: lineNum,
      isProtected,
      fileId: file.id,
      filePath
    });
  }

  // Sort by line number
  endpoints.sort((a, b) => a.line - b.line);

  return {
    fileName,
    filePath,
    fileId: file.id,
    endpoints,
    linkedModels: Array.from(linkedModelsSet)
  };
}

/**
 * Scans an entire workspace to extract all backend routes and compute statistics
 */
export function extractWorkspaceRoutes(files = []) {
  const routers = [];
  const allEndpoints = [];
  const linkedModels = new Set();
  let protectedCount = 0;

  files.forEach(file => {
    if (!file || !file.name || !file.content) return;
    if (isIgnoredPath(file.path, file.name)) return;

    // Scan all files across all directories (controllers, api, handlers, server, routes, etc.)
    const parsed = parseServerRoutes(file);
    if (parsed && parsed.endpoints.length > 0) {
      routers.push(parsed);
      parsed.endpoints.forEach(ep => {
        allEndpoints.push(ep);
        if (ep.isProtected) protectedCount++;
        ep.models.forEach(m => linkedModels.add(m));
      });
    }
  });

  // Calculate method breakdown
  const methodCounts = {
    ALL: allEndpoints.length,
    GET: allEndpoints.filter(e => e.method === "GET").length,
    POST: allEndpoints.filter(e => e.method === "POST").length,
    PUT: allEndpoints.filter(e => e.method === "PUT").length,
    DELETE: allEndpoints.filter(e => e.method === "DELETE").length,
    PATCH: allEndpoints.filter(e => e.method === "PATCH").length
  };

  return {
    routers,
    endpoints: allEndpoints,
    stats: {
      totalEndpoints: allEndpoints.length,
      routerFiles: routers.length,
      protectedCount,
      linkedModelsCount: linkedModels.size
    },
    methodCounts,
    linkedModels: Array.from(linkedModels)
  };
}

