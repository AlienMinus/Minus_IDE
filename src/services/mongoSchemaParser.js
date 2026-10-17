// src/services/mongoSchemaParser.js
// Advanced Mongoose / MongoDB AST & Static Schema Analyzer

import { isIgnoredPath } from "./architectureScanner";

/**
 * Pluralizes a model name to infer its MongoDB collection name
 */
export function inferCollectionName(modelName = "") {
  if (!modelName) return "documents";
  const lower = modelName.toLowerCase();
  if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z") || lower.endsWith("ch") || lower.endsWith("sh")) {
    return lower + "es";
  }
  if (lower.endsWith("y") && !/[aeiou]y$/.test(lower)) {
    return lower.slice(0, -1) + "ies";
  }
  return lower + "s";
}

/**
 * Recursively parses object literal or schema body into structured fields
 */
function parseSchemaObjectContent(content, prefix = "") {
  const fields = [];

  // Match top-level field blocks in the schema definition
  // e.g.:
  // name: { type: String, required: true }
  // roles: [String]
  // socialLinks: [{ ... }]
  // education: [educationSchema]
  // location: String
  const lines = content.split("\n");
  let depth = 0;
  let currentKey = "";
  let currentBlock = "";
  let inBlock = false;

  const flushField = (key, raw) => {
    if (!key) return;
    const cleanKey = key.trim();
    if (!cleanKey || cleanKey === "timestamps" || cleanKey.startsWith("_")) return;

    const fullKey = prefix ? `${prefix}.${cleanKey}` : cleanKey;
    const rawTrimmed = raw.trim();

    // 1. Array of Embedded Documents: field: [{ ... }]
    if (/^\[\s*\{/.test(rawTrimmed)) {
      fields.push({
        name: fullKey,
        type: "Object[]",
        required: rawTrimmed.includes("required: true"),
        unique: rawTrimmed.includes("unique: true"),
        index: rawTrimmed.includes("index: true"),
        isEmbedded: true
      });

      // Extract inner object content
      const innerMatch = rawTrimmed.match(/\[\s*\{([\s\S]*)\}\s*\]/);
      if (innerMatch && innerMatch[1]) {
        const nestedFields = parseSchemaObjectContent(innerMatch[1], fullKey);
        fields.push(...nestedFields);
      }
      return;
    }

    // 2. Array of primitives or subdocument schemas: field: [String] or field: [subSchema]
    const arrayPrimitiveMatch = rawTrimmed.match(/^\[\s*([a-zA-Z0-9_]+)\s*\]/);
    if (arrayPrimitiveMatch) {
      const innerType = arrayPrimitiveMatch[1];
      if (["String", "Number", "Boolean", "Date", "ObjectId", "Buffer"].includes(innerType)) {
        fields.push({
          name: fullKey,
          type: `${innerType}[]`,
          required: false,
          unique: false,
          index: false
        });
      } else {
        // Likely a subdocument schema reference
        fields.push({
          name: fullKey,
          type: "Object[]",
          subSchema: innerType,
          required: false,
          unique: false,
          index: false,
          isEmbedded: true
        });
      }
      return;
    }

    // 3. Map type: { type: Map, of: String } or Map
    if (rawTrimmed.includes("type: Map") || rawTrimmed === "Map" || rawTrimmed.startsWith("Map")) {
      const ofMatch = rawTrimmed.match(/of\s*:\s*([a-zA-Z0-9_]+)/);
      fields.push({
        name: fullKey,
        type: "Map",
        of: ofMatch ? ofMatch[1] : "Mixed",
        required: rawTrimmed.includes("required: true"),
        unique: rawTrimmed.includes("unique: true"),
        index: rawTrimmed.includes("index: true")
      });
      return;
    }

    // 4. Detailed object field: { type: String, required: true, ref: 'User' }
    if (rawTrimmed.startsWith("{") && rawTrimmed.includes("type")) {
      const typeMatch = rawTrimmed.match(/type\s*:\s*(?:mongoose\.Schema\.Types\.)?([a-zA-Z0-9_.]+)/);
      const refMatch = rawTrimmed.match(/ref\s*:\s*['"]([a-zA-Z0-9_]+)['"]/);
      const required = /required\s*:\s*(?:true|\[\s*true)/.test(rawTrimmed);
      const unique = /unique\s*:\s*true/.test(rawTrimmed);
      const index = /index\s*:\s*true/.test(rawTrimmed);
      const defaultMatch = rawTrimmed.match(/default\s*:\s*([^,\n}]+)/);

      let fieldType = typeMatch ? typeMatch[1] : "Mixed";
      if (fieldType.includes("ObjectId")) fieldType = "ObjectId";

      fields.push({
        name: fullKey,
        type: fieldType,
        required,
        unique,
        index,
        ref: refMatch ? refMatch[1] : null,
        defaultValue: defaultMatch ? defaultMatch[1].trim() : null
      });
      return;
    }

    // 5. Short primitive: location: String
    const shortPrimitiveMatch = rawTrimmed.match(/^(String|Number|Boolean|Date|Buffer|ObjectId|Mixed|Array)/i);
    if (shortPrimitiveMatch) {
      fields.push({
        name: fullKey,
        type: shortPrimitiveMatch[1],
        required: false,
        unique: false,
        index: false
      });
      return;
    }

    // 6. Generic field fallback
    fields.push({
      name: fullKey,
      type: "String",
      required: false,
      unique: false,
      index: false
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

    // Check key definition: keyName: ...
    const keyMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:\s*([\s\S]*)$/);
    if (!inBlock && keyMatch) {
      currentKey = keyMatch[1];
      const rest = keyMatch[2];

      // Count braces/brackets on the rest of the line
      const openBraces = (rest.match(/[{[]/g) || []).length;
      const closeBraces = (rest.match(/[}\]]/g) || []).length;
      depth = openBraces - closeBraces;

      currentBlock = rest;
      if (depth > 0) {
        inBlock = true;
      } else {
        flushField(currentKey, currentBlock.replace(/,\s*$/, ""));
        currentKey = "";
        currentBlock = "";
        inBlock = false;
      }
      continue;
    }

    if (inBlock) {
      currentBlock += "\n" + trimmed;
      const openBraces = (trimmed.match(/[{[]/g) || []).length;
      const closeBraces = (trimmed.match(/[}\]]/g) || []).length;
      depth += openBraces - closeBraces;

      if (depth <= 0) {
        flushField(currentKey, currentBlock.replace(/,\s*$/, ""));
        currentKey = "";
        currentBlock = "";
        inBlock = false;
        depth = 0;
      }
    }
  }

  return fields;
}

/**
 * Extracts all Mongoose schemas and models from a single file's content
 */
export function parseMongooseFile(file) {
  if (!file || !file.content) return null;
  const content = file.content;
  const fileName = file.name || "";
  const filePath = (file.path || fileName).toLowerCase().replace(/\\/g, "/");

  // Verify this file defines a Mongoose model or schema in any folder
  const hasSchema =
    content.includes("new mongoose.Schema") ||
    content.includes("new Schema") ||
    content.includes("mongoose.Schema") ||
    content.includes("Schema(") ||
    content.includes("mongoose.model") ||
    content.includes(".model(") ||
    filePath.includes("/models/") ||
    filePath.includes("/schemas/") ||
    filePath.includes("/entities/") ||
    filePath.includes("/database/") ||
    filePath.includes("/db/");

  if (!hasSchema) return null;

  // 1. Identify Model Name
  let modelName = "";
  const modelMatch = content.match(/mongoose\.model\s*\(\s*['"]([a-zA-Z0-9_]+)['"]/);
  if (modelMatch) {
    modelName = modelMatch[1];
  } else {
    // Derive from file basename: About.js -> About
    modelName = fileName.replace(/\.[^/.]+$/, "");
    modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
  }

  // 2. Identify explicit or inferred Collection Name
  let collection = "";
  const explicitCollectionMatch = content.match(/mongoose\.model\s*\(\s*['"][^'"]+['"]\s*,\s*[^,)]+\s*,\s*['"]([a-zA-Z0-9_]+)['"]/);
  if (explicitCollectionMatch) {
    collection = explicitCollectionMatch[1];
  } else {
    // Check collection option in schema options: { collection: 'abouts' }
    const optionMatch = content.match(/collection\s*:\s*['"]([a-zA-Z0-9_]+)['"]/);
    if (optionMatch) {
      collection = optionMatch[1];
    } else {
      collection = inferCollectionName(modelName);
    }
  }

  // 3. Extract sub-schemas defined in the file (e.g. const educationSchema = new mongoose.Schema({...}))
  const subSchemas = new Map();
  const subSchemaRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+Schema)\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*(?:,|\))/g;
  let sMatch;
  while ((sMatch = subSchemaRegex.exec(content)) !== null) {
    const sName = sMatch[1];
    const sBody = sMatch[2];
    subSchemas.set(sName, parseSchemaObjectContent(sBody));
  }

  // 4. Extract Main Schema Body: new mongoose.Schema({ ... })
  let mainSchemaContent = "";
  const mainSchemaMatch = content.match(/(?:new\s+)?(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*(?:,\s*\{[\s\S]*?\})?\s*\)/);
  if (mainSchemaMatch) {
    mainSchemaContent = mainSchemaMatch[1];
  } else {
    // Fallback: match entire object passed to model or exported
    const objMatch = content.match(/\{([\s\S]*)\}/);
    if (objMatch) mainSchemaContent = objMatch[1];
  }

  let fields = parseSchemaObjectContent(mainSchemaContent);

  // 5. Expand subSchema references if any
  const expandedFields = [];
  fields.forEach(f => {
    expandedFields.push(f);
    if (f.subSchema && subSchemas.has(f.subSchema)) {
      const subFields = subSchemas.get(f.subSchema);
      subFields.forEach(sf => {
        expandedFields.push({
          ...sf,
          name: `${f.name}.${sf.name}`,
          isEmbedded: true
        });
      });
    }
  });

  // 6. Detect indexes & relations
  const indexes = [];
  expandedFields.forEach(f => {
    if (f.unique || f.index) {
      indexes.push({ field: f.name, unique: !!f.unique });
    }
  });

  const relations = [];
  expandedFields.forEach(f => {
    if (f.ref) {
      relations.push({
        fromField: f.name,
        targetModel: f.ref,
        kind: "reference"
      });
    }
  });

  return {
    id: `model-${modelName.toLowerCase()}`,
    name: modelName,
    collection,
    fileName,
    filePath,
    fields: expandedFields,
    indexes,
    relations,
    fileId: file.id
  };
}

/**
 * Scans an entire workspace array of files and extracts all Mongoose models and schema statistics
 */
export function extractMongoSchemas(files = []) {
  const models = [];
  const modelMap = new Map();

  files.forEach(file => {
    if (!file || !file.name || !file.content) return;
    if (isIgnoredPath(file.path, file.name)) return;

    // Scan all files across all folders and subdirectories
    const parsed = parseMongooseFile(file);
    if (parsed && !modelMap.has(parsed.name.toLowerCase())) {
      modelMap.set(parsed.name.toLowerCase(), parsed);
      models.push(parsed);
    }
  });

  // Sort models alphabetically for clean display
  models.sort((a, b) => a.name.localeCompare(b.name));

  // Compute workspace schema statistics
  const totalModels = models.length;
  let totalFields = 0;
  let totalRelations = 0;
  let totalIndexes = 0;

  models.forEach(m => {
    totalFields += m.fields.length;
    totalRelations += m.relations.length;
    totalIndexes += m.indexes.length;
  });

  return {
    models,
    stats: {
      totalModels,
      totalFields,
      totalRelations,
      totalIndexes
    }
  };
}
