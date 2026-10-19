// src/services/mermaidGenerator.js
// Generates GitHub-flavored Mermaid diagrams dynamically from ArchitectureGraph and ExecutionSteps

export function generateArchitectureFlowchart(architectureGraph) {
  const { nodes = [], edges = [] } = architectureGraph || {};
  if (!nodes.length) return "flowchart TD\n  Empty[No workspace files detected]";

  const lines = [
    "%%{init: {'flowchart': {'curve': 'stepBefore', 'nodeSpacing': 45, 'rankSpacing': 55}}}%%",
    "flowchart TD"
  ];

  // Vibrant, high-contrast dark-mode styling classes with large readable text
  lines.push("  classDef appStyle fill:#1e1b4b,stroke:#818cf8,stroke-width:2.5px,color:#ffffff,font-size:14px;");
  lines.push("  classDef pageStyle fill:#0c1e33,stroke:#38bdf8,stroke-width:2.2px,color:#ffffff,font-size:13px;");
  lines.push("  classDef compStyle fill:#062a1a,stroke:#22c55e,stroke-width:2px,color:#ffffff,font-size:12px;");
  lines.push("  classDef hookStyle fill:#2c0b3b,stroke:#c084fc,stroke-width:2px,color:#ffffff,font-size:12px;");
  lines.push("  classDef ctxStyle fill:#331e05,stroke:#f59e0b,stroke-width:2px,color:#ffffff,font-size:13px;");
  lines.push("  classDef srvStyle fill:#1a103c,stroke:#818cf8,stroke-width:2px,color:#ffffff,font-size:13px;");
  lines.push("  classDef backendStyle fill:#3b0a0a,stroke:#f87171,stroke-width:2.5px,color:#ffffff,font-size:14px;");
  lines.push("  classDef modelStyle fill:#022c22,stroke:#00ff88,stroke-width:2.5px,color:#ffffff,font-size:14px;");
  lines.push("  classDef configStyle fill:#1a202c,stroke:#94a3b8,stroke-width:2px,color:#ffffff,font-size:12px;");

  // Separate nodes by architectural role
  const pageNodes = nodes.filter(n => n.layer === "page");
  const compNodes = nodes.filter(n => n.layer === "component");
  const ctxNodes = nodes.filter(n => n.layer === "context");
  const hookNodes = nodes.filter(n => n.layer === "hook");
  const srvNodes = nodes.filter(n => n.layer === "service");
  const backendNodes = nodes.filter(n => n.layer === "backend");
  const modelNodes = nodes.filter(n => n.layer === "model");
  const configNodes = nodes.filter(n => n.layer === "config");

  // Identify router/entry point (e.g. App.jsx, App.js, main.jsx)
  const appNode = compNodes.find(n => /^app$/i.test(n.name)) || pageNodes.find(n => /^app$/i.test(n.name));
  const remainingComps = compNodes.filter(n => n !== appNode);

  // 1. TIER 1 (TOP): FRONTEND PRESENTATION LAYER (Router -> Pages -> Components)
  const hasFrontend = appNode || pageNodes.length > 0 || remainingComps.length > 0;
  if (hasFrontend) {
    lines.push('  subgraph TIER_FRONTEND ["🌐 Presentation Tier (Frontend UI)"]');
    lines.push("    direction TB");

    if (appNode) {
      const cleanId = appNode.id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push('    subgraph ROUTER_BOX ["🖥️ Application Router & Entry"]');
      lines.push("      direction TB");
      lines.push(`      ${cleanId}["<b>${appNode.name}</b><br/><small style='color:#a1a1aa;'>${appNode.fileName}</small>"]:::appStyle`);
      lines.push("    end");
    }

    if (pageNodes.length > 0) {
      lines.push('    subgraph PAGES ["📄 Views & Route Pages"]');
      lines.push("      direction TB");
      pageNodes.forEach(node => {
        const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`      ${cleanId}["📄 <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::pageStyle`);
      });
      lines.push("    end");
    }

    if (remainingComps.length > 0) {
      lines.push('    subgraph COMPONENTS ["🧩 UI Components & Widgets"]');
      lines.push("      direction TB");
      remainingComps.forEach(node => {
        const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`      ${cleanId}["🧩 <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::compStyle`);
      });
      // To prevent components from stretching into one huge horizontal row,
      // wrap them into rows of 4 using rank-ordering invisible links
      for (let i = 0; i < remainingComps.length - 4; i += 4) {
        const fromC = remainingComps[i].id.replace(/[^a-zA-Z0-9_]/g, "_");
        const toC = remainingComps[i + 4].id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`      ${fromC} ~~~ ${toC}`);
      }
      lines.push("    end");
    }

    lines.push("  end");
  }

  // 2. TIER 2: STATE MANAGEMENT & CLIENT SERVICES TIER (Stacked below Frontend)
  const hasStateServices = ctxNodes.length > 0 || hookNodes.length > 0 || srvNodes.length > 0;
  if (hasStateServices) {
    lines.push('  subgraph TIER_STATE_SERVICES ["⚡ State Management & Client Services Tier"]');
    lines.push("    direction TB");

    if (ctxNodes.length > 0) {
      lines.push('    subgraph CONTEXTS ["🔄 React Context & State Providers"]');
      lines.push("      direction TB");
      ctxNodes.forEach(node => {
        const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`      ${cleanId}["🔄 <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::ctxStyle`);
      });
      lines.push("    end");
    }

    if (hookNodes.length > 0) {
      lines.push('    subgraph HOOKS ["🪝 Custom Hooks"]');
      lines.push("      direction TB");
      hookNodes.forEach(node => {
        const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`      ${cleanId}["🪝 <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::hookStyle`);
      });
      lines.push("    end");
    }

    if (srvNodes.length > 0) {
      lines.push('    subgraph SERVICES ["🛠️ API Clients & Networking Services"]');
      lines.push("      direction TB");
      srvNodes.forEach(node => {
        const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`      ${cleanId}["🛠️ <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::srvStyle`);
      });
      lines.push("    end");
    }

    lines.push("  end");
  }

  // 3. TIER 3: BACKEND SERVER & CONTROLLERS (Stacked below State & Services)
  if (backendNodes.length > 0) {
    lines.push('  subgraph TIER_BACKEND ["🚀 Backend Server & API Services Tier"]');
    lines.push("    direction TB");
    lines.push('    subgraph CONTROLLERS ["🚀 Express Controllers & Server"]');
    lines.push("      direction TB");
    backendNodes.forEach(node => {
      const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`      ${cleanId}["🚀 <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::backendStyle`);
    });
    lines.push("    end");
    lines.push("  end");
  }

  // 4. TIER 4: DATABASE MODELS & SCHEMAS (Stacked at the bottom)
  if (modelNodes.length > 0) {
    lines.push('  subgraph TIER_DATABASE ["🗄️ MongoDB Database Models & Schemas Tier"]');
    lines.push("    direction TB");
    modelNodes.forEach(node => {
      const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`    ${cleanId}[("🗄️ <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>")]:::modelStyle`);
    });
    for (let i = 0; i < modelNodes.length - 4; i += 4) {
      const fromM = modelNodes[i].id.replace(/[^a-zA-Z0-9_]/g, "_");
      const toM = modelNodes[i + 4].id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`    ${fromM} ~~~ ${toM}`);
    }
    lines.push("  end");
  }

  // 5. TIER 5 (OPTIONAL): CONFIGURATION & ENVIRONMENT
  if (configNodes.length > 0) {
    lines.push('  subgraph TIER_CONFIG ["⚙️ Configuration & Environment Tier"]');
    lines.push("    direction TB");
    configNodes.slice(0, 6).forEach(node => {
      const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`    ${cleanId}["⚙️ <b>${node.name}</b><br/><small style='color:#a1a1aa;'>${node.fileName}</small>"]:::configStyle`);
    });
    lines.push("  end");
  }

  // Enforce strict vertical stacking between tiers using invisible rank constraints
  const tierAnchors = [];
  if (appNode) tierAnchors.push(appNode.id.replace(/[^a-zA-Z0-9_]/g, "_"));
  else if (pageNodes[0]) tierAnchors.push(pageNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));
  else if (compNodes[0]) tierAnchors.push(compNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));

  if (ctxNodes[0]) tierAnchors.push(ctxNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));
  else if (hookNodes[0]) tierAnchors.push(hookNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));
  else if (srvNodes[0]) tierAnchors.push(srvNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));

  if (backendNodes[0]) tierAnchors.push(backendNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));
  if (modelNodes[0]) tierAnchors.push(modelNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_"));

  for (let t = 0; t < tierAnchors.length - 1; t++) {
    lines.push(`  ${tierAnchors[t]} ~~~ ${tierAnchors[t + 1]}`);
  }

  // Connect App Router to Pages if App exists
  if (appNode) {
    const appId = appNode.id.replace(/[^a-zA-Z0-9_]/g, "_");
    pageNodes.forEach(page => {
      const pageId = page.id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`  ${appId} -->|routes to| ${pageId}`);
    });
  }

  // Semantic architectural connections (edges)
  const seenEdges = new Set();
  edges.slice(0, 80).forEach(edge => {
    const fromId = edge.source.replace(/[^a-zA-Z0-9_]/g, "_");
    const toId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_");
    const edgeKey = `${fromId}->${toId}`;
    if (fromId && toId && !seenEdges.has(edgeKey)) {
      seenEdges.add(edgeKey);
      let edgeLabel = "";
      if (edge.kind === "query") edgeLabel = "|queries|";
      else if (edge.kind === "render") edgeLabel = "|renders|";
      else if (edge.kind === "relation") edgeLabel = "|references|";
      else if (edge.kind === "fetch") edgeLabel = "|fetches|";
      else if (edge.label) edgeLabel = `|${edge.label.slice(0, 18)}|`;

      lines.push(`  ${fromId} -->${edgeLabel} ${toId}`);
    }
  });

  // Inter-tier connections if not already linked by explicit edges
  if (srvNodes.length > 0 && backendNodes.length > 0 && !edges.some(e => e.source?.includes("service") && e.target?.includes("backend"))) {
    const firstSrv = srvNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_");
    const firstBack = backendNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`  ${firstSrv} -.->|HTTP API calls| ${firstBack}`);
  }

  if (backendNodes.length > 0 && modelNodes.length > 0 && !edges.some(e => e.source?.includes("backend") && e.target?.includes("model"))) {
    const firstBack = backendNodes[0].id.replace(/[^a-zA-Z0-9_]/g, "_");
    modelNodes.slice(0, 3).forEach(m => {
      const mId = m.id.replace(/[^a-zA-Z0-9_]/g, "_");
      lines.push(`  ${firstBack} -.->|persists/queries| ${mId}`);
    });
  }

  return lines.join("\n");
}

export function generateSequenceMermaid(executionSteps) {
  if (!executionSteps || !executionSteps.length) {
    return "sequenceDiagram\n  autonumber\n  Client->>Server: Ready";
  }

  const lines = [
    "sequenceDiagram",
    "  autonumber"
  ];

  // Unique participants
  const participants = new Set();
  executionSteps.forEach(step => {
    if (step.source) participants.add(step.source.replace(/[^a-zA-Z0-9_]/g, "_"));
    if (step.target) participants.add(step.target.replace(/[^a-zA-Z0-9_]/g, "_"));
  });

  Array.from(participants).slice(0, 8).forEach(p => {
    lines.push(`  participant ${p}`);
  });

  executionSteps.forEach(step => {
    const from = (step.source || "Client").replace(/[^a-zA-Z0-9_]/g, "_");
    const to = (step.target || "Server").replace(/[^a-zA-Z0-9_]/g, "_");
    const label = (step.action || "Executes").replace(/[:"\n]/g, " ");
    lines.push(`  ${from}->>${to}: ${label}`);
  });

  return lines.join("\n");
}

export function generateEntityRelationshipDiagram(nodes) {
  const models = nodes.filter(n => n.layer === "model");
  if (!models.length) return "erDiagram\n  NO_MODELS ||--|| WORKSPACE : contains";

  const lines = ["erDiagram"];
  const subSchemasCreated = new Set();

  models.forEach(model => {
    const cleanName = model.name.replace(/[^a-zA-Z0-9_]/g, "");
    lines.push(`  ${cleanName} {`);
    const fields = model.details?.fields || [];
    if (fields.length === 0) {
      lines.push("    string id PK");
    } else {
      const topFields = fields.filter(f => !f.name.includes("."));
      (topFields.length ? topFields : fields).slice(0, 10).forEach(f => {
        const type = (f.type || "string").toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        const name = (f.name || "field").replace(/[^a-zA-Z0-9_]/g, "");
        lines.push(`    ${type} ${name}`);
      });
    }
    lines.push("  }");

    // Render nested sub-schema entities & embeds relationship
    const subSchemas = model.details?.subSchemas || [];
    subSchemas.forEach(sub => {
      const subClean = sub.name.replace(/[^a-zA-Z0-9_]/g, "");
      if (!subSchemasCreated.has(subClean)) {
        subSchemasCreated.add(subClean);
        lines.push(`  ${subClean} {`);
        (sub.fields || []).slice(0, 8).forEach(sf => {
          const sType = (sf.type || "string").toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
          const sName = (sf.name || "field").replace(/[^a-zA-Z0-9_]/g, "");
          lines.push(`    ${sType} ${sName}`);
        });
        lines.push("  }");
      }
      lines.push(`  ${cleanName} ||--o{ ${subClean} : embeds`);
    });

    // Relations
    (model.details?.relations || []).forEach(rel => {
      const targetClean = rel.targetModel.replace(/[^a-zA-Z0-9_]/g, "");
      lines.push(`  ${cleanName} }|..|{ ${targetClean} : references`);
    });
  });

  return lines.join("\n");
}

