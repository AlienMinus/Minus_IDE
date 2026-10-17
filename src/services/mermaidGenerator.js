// src/services/mermaidGenerator.js
// Generates GitHub-flavored Mermaid diagrams from ArchitectureGraph and ExecutionSteps

export function generateArchitectureFlowchart(architectureGraph) {
  const { nodes = [], edges = [] } = architectureGraph;
  if (!nodes.length) return "flowchart TD\n  Empty[No workspace files detected]";

  const lines = ["flowchart TD"];

  // Group nodes into subgraphs by architectural layer
  const layers = [
    { key: "model", title: "🗄️ Database Models & Schemas" },
    { key: "backend", title: "🚀 Backend Server & API Routes" },
    { key: "service", title: "🛠️ Services & API Clients" },
    { key: "context", title: "🔄 Global State & Context Providers" },
    { key: "hook", title: "🪝 Custom Hooks" },
    { key: "component", title: "🧩 UI Components" },
    { key: "page", title: "📄 Pages & Views" },
    { key: "util", title: "⚙️ Utilities & Helpers" }
  ];

  layers.forEach(layer => {
    const layerNodes = nodes.filter(n => n.layer === layer.key);
    if (layerNodes.length > 0) {
      lines.push(`  subgraph ${layer.key.toUpperCase()} ["${layer.title}"]`);
      layerNodes.forEach(node => {
        const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
        const cleanName = node.name.replace(/["\n]/g, "");
        lines.push(`    ${cleanId}["${cleanName}"]`);
      });
      lines.push("  end");
    }
  });

  // Add connections (edges)
  edges.slice(0, 50).forEach(edge => {
    const fromId = edge.source.replace(/[^a-zA-Z0-9_]/g, "_");
    const toId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_");
    if (fromId && toId) {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  });

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

  models.forEach(model => {
    const cleanName = model.name.replace(/[^a-zA-Z0-9_]/g, "");
    lines.push(`  ${cleanName} {`);
    const fields = model.details?.fields || [];
    if (fields.length === 0) {
      lines.push("    string id PK");
    } else {
      fields.slice(0, 10).forEach(f => {
        const type = (f.type || "string").toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        const name = (f.name || "field").replace(/[^a-zA-Z0-9_]/g, "");
        lines.push(`    ${type} ${name}`);
      });
    }
    lines.push("  }");

    // Relations
    (model.details?.relations || []).forEach(rel => {
      const targetClean = rel.targetModel.replace(/[^a-zA-Z0-9_]/g, "");
      lines.push(`  ${cleanName} }|..|{ ${targetClean} : references`);
    });
  });

  return lines.join("\n");
}

