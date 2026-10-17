// src/services/lifecycleTracer.js
// Chronological execution sequence and lifecycle tracer for Hyperion WebIDE

/**
 * Traces end-to-end execution flows across the scanned architecture.
 * Produces ordered execution steps with code locations, symbols, and actions.
 */
export function traceExecutionSequences(architectureGraph) {
  const { nodes = [] } = architectureGraph;
  const steps = [];
  let stepIndex = 1;

  const findNode = (nameSubstring, layer) => {
    return nodes.find(n => {
      const matchName = n.name.toLowerCase().includes(nameSubstring.toLowerCase());
      return layer ? matchName && n.layer === layer : matchName;
    });
  };

  // ---------------------------------------------------------
  // PHASE 1: SYSTEM BOOT & RUNTIME INITIALIZATION
  // ---------------------------------------------------------
  const backendServer = findNode("server", "backend") || findNode("app", "backend");
  if (backendServer) {
    steps.push({
      id: `step-${stepIndex++}`,
      phase: "BOOT",
      phaseTitle: "Backend Server Bootstrap",
      source: backendServer.name,
      sourceLayer: "backend",
      target: "Environment & Config",
      action: "Load environment variables via dotenv.config()",
      symbol: "process.env (PORT, MONGODB_URI)",
      filePath: backendServer.filePath,
      description: "Server process initializes and injects environment secrets and port configuration."
    });

    const hasMongoose = backendServer.imports?.some(i => i.source?.includes("mongoose")) ||
                        nodes.some(n => n.layer === "model");
    if (hasMongoose) {
      steps.push({
        id: `step-${stepIndex++}`,
        phase: "BOOT",
        phaseTitle: "Database Connection",
        source: backendServer.name,
        sourceLayer: "backend",
        target: "MongoDB / Database Driver",
        action: "Connect to database with mongoose.connect(MONGODB_URI)",
        symbol: "mongoose.connect()",
        filePath: backendServer.filePath,
        description: "Establishes asynchronous connection pool with the MongoDB cluster."
      });
    }

    steps.push({
      id: `step-${stepIndex++}`,
      phase: "BOOT",
      phaseTitle: "Middleware Initialization",
      source: backendServer.name,
      sourceLayer: "backend",
      target: "Express Pipeline",
      action: "Mount CORS and JSON body-parser middleware",
      symbol: "app.use(cors()), app.use(express.json())",
      filePath: backendServer.filePath,
      description: "Configures cross-origin security headers and inbound payload parsing."
    });
  }

  // Frontend Boot
  const mainEntry = findNode("main", "component") || findNode("index", "component") || nodes.find(n => n.fileName.includes("main.jsx"));
  if (mainEntry) {
    steps.push({
      id: `step-${stepIndex++}`,
      phase: "BOOT",
      phaseTitle: "Client Bundle Hydration",
      source: mainEntry.name,
      sourceLayer: "component",
      target: "DOM Root (#root)",
      action: "ReactDOM.createRoot().render()",
      symbol: "createRoot()",
      filePath: mainEntry.filePath,
      description: "Mounts React virtual DOM root and initializes the top-level application component tree."
    });
  }

  // ---------------------------------------------------------
  // PHASE 2: CONTEXT PROVIDERS & STATE INITIALIZATION
  // ---------------------------------------------------------
  const contexts = nodes.filter(n => n.layer === "context");
  contexts.forEach(ctx => {
    const stateList = ctx.details?.stateVars?.map(s => s.state).join(", ") || "initial state";
    steps.push({
      id: `step-${stepIndex++}`,
      phase: "MOUNT",
      phaseTitle: "Context Provider Mounting",
      source: ctx.name,
      sourceLayer: "context",
      target: "React Tree",
      action: `Initialize state variables: [${stateList}]`,
      symbol: `${ctx.name}.Provider`,
      filePath: ctx.filePath,
      description: `Provider instantiates state stores and prepares context distribution for all child consumers.`
    });
  });

  // ---------------------------------------------------------
  // PHASE 3: COMPONENT LIFECYCLE & ASYNC DATA FETCHING
  // ---------------------------------------------------------
  const services = nodes.filter(n => n.layer === "service");
  const models = nodes.filter(n => n.layer === "model");

  contexts.forEach(ctx => {
    // If Context has loadData or fetch methods
    const fetchFunc = ctx.details?.functions?.find(f => /load|fetch|init|get/i.test(f));
    if (fetchFunc) {
      steps.push({
        id: `step-${stepIndex++}`,
        phase: "DATA_FETCH",
        phaseTitle: "Lifecycle Hook Dispatch",
        source: ctx.name,
        sourceLayer: "context",
        target: "Async Service / API Client",
        action: `useEffect() triggers ${fetchFunc}()`,
        symbol: `${fetchFunc}()`,
        filePath: ctx.filePath,
        description: `Component/Provider mount triggers initial async data retrieval.`
      });

      // Target service
      const matchingService = services[0];
      if (matchingService) {
        const apiFunc = matchingService.details?.apiFunctions?.[0] || "fetchData()";
        steps.push({
          id: `step-${stepIndex++}`,
          phase: "DATA_FETCH",
          phaseTitle: "Network HTTP Request",
          source: matchingService.name,
          sourceLayer: "service",
          target: backendServer ? backendServer.name : "Backend API",
          action: `Dispatches HTTP fetch request to API endpoint`,
          symbol: `${apiFunc}`,
          filePath: matchingService.filePath,
          description: `Constructs HTTP request with headers, query parameters, and timeout abort controller.`
        });

        if (backendServer) {
          steps.push({
            id: `step-${stepIndex++}`,
            phase: "DATA_FETCH",
            phaseTitle: "Backend Route Handler",
            source: backendServer.name,
            sourceLayer: "backend",
            target: models.length > 0 ? models.map(m => m.name).slice(0, 3).join(", ") : "Database",
            action: `Route controller executes database query`,
            symbol: `app.get("/api/...") -> Model.find()`,
            filePath: backendServer.filePath,
            description: `Server receives request, queries MongoDB collections, and aggregates document models.`
          });

          steps.push({
            id: `step-${stepIndex++}`,
            phase: "DATA_FETCH",
            phaseTitle: "Response Serialization & Return",
            source: backendServer.name,
            sourceLayer: "backend",
            target: matchingService.name,
            action: `Serialize MongoDB documents to JSON & return HTTP 200`,
            symbol: `res.json({ success: true, data })`,
            filePath: backendServer.filePath,
            description: `Server serializes payload and streams response back across network socket.`
          });
        }

        steps.push({
          id: `step-${stepIndex++}`,
          phase: "RECONCILE",
          phaseTitle: "State Reconciliation & Re-render",
          source: matchingService.name,
          sourceLayer: "service",
          target: ctx.name,
          action: `Promise resolves and updates state via setter`,
          symbol: `setData(payload), setLoading(false)`,
          filePath: ctx.filePath,
          description: `Context store updates with incoming records, causing subscriber components to reconcile and paint DOM.`
        });
      }
    }
  });

  // ---------------------------------------------------------
  // PHASE 4: UI COMPONENTS RENDER & USER INTERACTION
  // ---------------------------------------------------------
  const pages = nodes.filter(n => n.layer === "page" || n.layer === "component");
  const interactivePages = pages.filter(p => p.details?.functions?.some(f => /handle|submit|click|save/i.test(f)));

  interactivePages.slice(0, 3).forEach(page => {
    const handler = page.details?.functions?.find(f => /handle|submit|click|save/i.test(f));
    steps.push({
      id: `step-${stepIndex++}`,
      phase: "MUTATION",
      phaseTitle: "User Interaction & Event Dispatch",
      source: "User Action (Click / Form Submit)",
      sourceLayer: "page",
      target: page.name,
      action: `Invokes event handler: ${handler}()`,
      symbol: `${page.name} -> ${handler}()`,
      filePath: page.filePath,
      description: `User interaction triggers state validation and dispatches API update mutation.`
    });
  });

  return steps;
}

