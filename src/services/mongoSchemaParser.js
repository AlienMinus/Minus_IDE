// src/services/mongoSchemaParser.js
// Advanced Mongoose / MongoDB AST & Static Schema Analyzer

import { isIgnoredPath } from "./architectureScanner.js";

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

    // 1. Array of Embedded Documents or Array of primitives with options: field: [{ ... }]
    if (/^\[\s*\{/.test(rawTrimmed)) {
      const innerMatch = rawTrimmed.match(/\[\s*\{([\s\S]*)\}\s*\]/);
      const innerContent = innerMatch && innerMatch[1] ? innerMatch[1] : "";

      // Check if it's [{ type: String, ... }] (an array of primitives with options like trim, required)
      const primitiveTypeMatch = innerContent.match(/type\s*:\s*(?:mongoose\.Schema\.Types\.)?([a-zA-Z0-9_.]+)/);
      if (primitiveTypeMatch && ["String", "Number", "Boolean", "Date", "ObjectId", "Buffer"].includes(primitiveTypeMatch[1])) {
        fields.push({
          name: fullKey,
          type: `${primitiveTypeMatch[1]}[]`,
          required: innerContent.includes("required: true"),
          unique: innerContent.includes("unique: true"),
          index: innerContent.includes("index: true")
        });
        return;
      }

      const directSubFields = parseSchemaObjectContent(innerContent);

      fields.push({
        name: fullKey,
        type: "Object[]",
        required: rawTrimmed.includes("required: true"),
        unique: rawTrimmed.includes("unique: true"),
        index: rawTrimmed.includes("index: true"),
        isEmbedded: true,
        subFields: directSubFields
      });

      if (innerContent) {
        const nestedFields = parseSchemaObjectContent(innerContent, fullKey);
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
          subSchemaName: innerType,
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
      const arrayTypeMatch = rawTrimmed.match(/type\s*:\s*\[\s*([a-zA-Z0-9_]+)\s*\]/);
      if (arrayTypeMatch && !["String", "Number", "Boolean", "Date", "ObjectId", "Buffer"].includes(arrayTypeMatch[1])) {
        const subName = arrayTypeMatch[1];
        fields.push({
          name: fullKey,
          type: "Object[]",
          subSchema: subName,
          subSchemaName: subName,
          required: /required\s*:\s*(?:true|\[\s*true)/.test(rawTrimmed),
          unique: /unique\s*:\s*true/.test(rawTrimmed),
          index: /index\s*:\s*true/.test(rawTrimmed),
          isEmbedded: true
        });
        return;
      }

      const typeMatch = rawTrimmed.match(/type\s*:\s*(?:mongoose\.Schema\.Types\.)?([a-zA-Z0-9_.]+)/);
      const refMatch = rawTrimmed.match(/ref\s*:\s*['"]([a-zA-Z0-9_]+)['"]/);
      const required = /required\s*:\s*(?:true|\[\s*true)/.test(rawTrimmed);
      const unique = /unique\s*:\s*true/.test(rawTrimmed);
      const index = /index\s*:\s*true/.test(rawTrimmed);
      const defaultMatch = rawTrimmed.match(/default\s*:\s*([^,\n}]+)/);

      let fieldType = typeMatch ? typeMatch[1] : "Mixed";
      if (fieldType.includes("ObjectId")) fieldType = "ObjectId";

      if (fieldType.endsWith("Schema")) {
        fields.push({
          name: fullKey,
          type: rawTrimmed.includes("[") ? "Object[]" : "Object",
          subSchema: fieldType,
          subSchemaName: fieldType,
          required,
          unique,
          index,
          isEmbedded: true
        });
        return;
      }

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

    // 5b. Direct subSchema identifier: education: educationSchema
    const directSchemaMatch = rawTrimmed.match(/^([a-zA-Z0-9_]+Schema)$/);
    if (directSchemaMatch) {
      const subName = directSchemaMatch[1];
      fields.push({
        name: fullKey,
        type: "Object",
        subSchema: subName,
        subSchemaName: subName,
        required: false,
        unique: false,
        index: false,
        isEmbedded: true
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
 * Extracts a balanced JavaScript object body `{ ... }` starting from or after startIdx
 */
function extractBalancedObject(src, startIdx = 0) {
  const openBraceIdx = src.indexOf("{", startIdx);
  if (openBraceIdx === -1) return null;

  let depth = 0;
  let inStr = false;
  let strChar = "";
  let endIdx = -1;

  for (let i = openBraceIdx; i < src.length; i++) {
    const c = src[i];
    const prev = src[i - 1];

    if (inStr) {
      if (c === strChar && prev !== "\\") {
        inStr = false;
      }
    } else if (c === '"' || c === "'" || c === "`") {
      inStr = true;
      strChar = c;
    } else if (c === "/" && src[i + 1] === "/") {
      const nextLine = src.indexOf("\n", i);
      if (nextLine === -1) break;
      i = nextLine;
    } else if (c === "/" && src[i + 1] === "*") {
      const endComment = src.indexOf("*/", i + 2);
      if (endComment === -1) break;
      i = endComment + 1;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) return null;
  return {
    start: openBraceIdx,
    end: endIdx,
    body: src.substring(openBraceIdx + 1, endIdx)
  };
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

  // 1b. Identify schema variable name passed to mongoose.model('ModelName', schemaVar)
  let mainSchemaVar = "";
  const modelSchemaVarMatch = content.match(/mongoose\.model\s*\(\s*['"][^'"]+['"]\s*,\s*([a-zA-Z0-9_]+)/);
  if (modelSchemaVarMatch) {
    mainSchemaVar = modelSchemaVarMatch[1];
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

  // 3. Extract all Schema definitions in the file using balanced brace parsing
  const allSchemas = new Map();

  // Pattern 1: Variable declarations: const userSchema = new mongoose.Schema({ ... })
  const schemaVarRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(/g;
  let vMatch;
  while ((vMatch = schemaVarRegex.exec(content)) !== null) {
    const sName = vMatch[1];
    const obj = extractBalancedObject(content, vMatch.index + vMatch[0].length);
    if (obj) {
      allSchemas.set(sName, {
        body: obj.body,
        fields: parseSchemaObjectContent(obj.body)
      });
    }
  }

  // Pattern 2: Inline model schemas: mongoose.model('User', new Schema({ ... }))
  const inlineModelRegex = /mongoose\.model\s*\(\s*['"]([a-zA-Z0-9_]+)['"]\s*,\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(/g;
  let iMatch;
  while ((iMatch = inlineModelRegex.exec(content)) !== null) {
    const mName = iMatch[1];
    const sName = `${mName}Schema`;
    if (!allSchemas.has(sName)) {
      const obj = extractBalancedObject(content, iMatch.index + iMatch[0].length);
      if (obj) {
        allSchemas.set(sName, {
          body: obj.body,
          fields: parseSchemaObjectContent(obj.body)
        });
        if (!mainSchemaVar) mainSchemaVar = sName;
      }
    }
  }

  // Pattern 3: Any other anonymous Schema({ ... }) if none found yet
  if (allSchemas.size === 0) {
    const anonRegex = /(?:new\s+)?(?:mongoose\.)?Schema\s*\(/g;
    let aMatch;
    let count = 0;
    while ((aMatch = anonRegex.exec(content)) !== null) {
      count++;
      const sName = count === 1 ? `${modelName}Schema` : `subSchema_${count}`;
      const obj = extractBalancedObject(content, aMatch.index + aMatch[0].length);
      if (obj) {
        allSchemas.set(sName, {
          body: obj.body,
          fields: parseSchemaObjectContent(obj.body)
        });
      }
    }
  }

  // Determine which schema is the main schema
  let mainSchemaContent = "";
  let mainSchemaKey = "";

  if (mainSchemaVar && allSchemas.has(mainSchemaVar)) {
    mainSchemaKey = mainSchemaVar;
    mainSchemaContent = allSchemas.get(mainSchemaVar).body;
  } else {
    // Check if any schema matches modelName + Schema (e.g. AboutSchema, aboutSchema)
    for (const [sName, sData] of allSchemas.entries()) {
      if (sName.toLowerCase() === `${modelName.toLowerCase()}schema` || sName.toLowerCase() === modelName.toLowerCase()) {
        mainSchemaKey = sName;
        mainSchemaContent = sData.body;
        break;
      }
    }
    // Sub-schemas are usually defined before the main schema, so default to the last defined schema
    if (!mainSchemaContent && allSchemas.size > 0) {
      const keys = Array.from(allSchemas.keys());
      mainSchemaKey = keys[keys.length - 1];
      mainSchemaContent = allSchemas.get(mainSchemaKey).body;
    }
  }

  // Fallback if no schema matched
  if (!mainSchemaContent) {
    const rawObj = extractBalancedObject(content, 0);
    if (rawObj) mainSchemaContent = rawObj.body;
  }

  // Sub-schemas are all schemas in allSchemas except the main schema
  const subSchemas = new Map();
  for (const [sName, sData] of allSchemas.entries()) {
    if (sName !== mainSchemaKey) {
      subSchemas.set(sName, sData.fields);
    }
  }

  let fields = parseSchemaObjectContent(mainSchemaContent);

  // 5. Expand subSchema references and link subFields
  const expandedFields = [];
  fields.forEach(f => {
    expandedFields.push(f);
    if (f.subSchema && subSchemas.has(f.subSchema)) {
      const subFields = subSchemas.get(f.subSchema);
      f.subFields = subFields;
      f.subSchemaName = f.subSchema;
      subFields.forEach(sf => {
        expandedFields.push({
          ...sf,
          name: `${f.name}.${sf.name}`,
          isEmbedded: true
        });
      });
    } else if (f.isEmbedded && f.subFields) {
      f.subSchemaName = f.subSchemaName || `${f.name}Schema`;
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

  const subSchemasList = [];
  subSchemas.forEach((sFields, sName) => {
    subSchemasList.push({
      name: sName,
      fields: sFields
    });
  });

  // Also include inline embedded schemas in subSchemasList if not already present
  fields.forEach(f => {
    if (f.subFields && f.subFields.length > 0) {
      const sName = f.subSchemaName || `${f.name}Schema`;
      if (!subSchemasList.some(s => s.name === sName)) {
        subSchemasList.push({
          name: sName,
          fields: f.subFields,
          parentField: f.name
        });
      }
    }
  });

  return {
    id: `model-${modelName.toLowerCase()}`,
    name: modelName,
    collection,
    fileName,
    filePath,
    fields: expandedFields,
    topLevelFields: fields,
    subSchemas: subSchemasList,
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
