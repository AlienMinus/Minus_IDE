import { lintCode } from "../services/sandboxService";

/**
 * Heuristic client-side syntax checks for immediate, zero-latency feedback
 */
export function checkClientSyntax(code = "", language = "", filename = "") {
  const markers = [];
  const lines = code.split("\n");
  const lang = (language || "").toLowerCase();
  const isC = lang === "c" || lang === "cpp" || filename.endsWith(".c") || filename.endsWith(".cpp") || filename.endsWith(".h");

  // 1. Bracket & Parentheses Matching
  const stack = [];
  const bracketPairs = { ")": "(", "}": "{", "]": "[" };
  const openingBrackets = new Set(["(", "{", "["]);

  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    // Skip preprocessor and comments in C
    if (isC && trimmed.startsWith("#")) continue;

    let inString = false;
    let stringChar = "";

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      const nextChar = line[colIdx + 1];

      // Handle comments
      if (!inString) {
        if (!inBlockComment && char === "/" && nextChar === "*") {
          inBlockComment = true;
          colIdx++;
          continue;
        }
        if (inBlockComment && char === "*" && nextChar === "/") {
          inBlockComment = false;
          colIdx++;
          continue;
        }
        if (inBlockComment) continue;
        if (char === "/" && nextChar === "/") break; // Line comment
        if (char === "#" && (lang === "python" || filename.endsWith(".py"))) break;
      }

      if (inBlockComment) continue;

      // Handle string literals
      if ((char === '"' || char === "'") && line[colIdx - 1] !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char) {
          inString = false;
          stringChar = "";
        }
        continue;
      }

      if (inString) continue;

      // Track brackets
      if (openingBrackets.has(char)) {
        stack.push({ char, line: lineIdx + 1, col: colIdx + 1 });
      } else if (bracketPairs[char]) {
        const expected = bracketPairs[char];
        if (stack.length === 0) {
          markers.push({
            startLineNumber: lineIdx + 1,
            startColumn: colIdx + 1,
            endLineNumber: lineIdx + 1,
            endColumn: colIdx + 2,
            message: `Unexpected closing '${char}'`,
            severity: 8,
            source: isC ? "C Syntax" : "Syntax"
          });
        } else {
          const last = stack.pop();
          if (last.char !== expected) {
            markers.push({
              startLineNumber: lineIdx + 1,
              startColumn: colIdx + 1,
              endLineNumber: lineIdx + 1,
              endColumn: colIdx + 2,
              message: `Mismatched bracket: found '${char}', expected '${
                last.char === "(" ? ")" : last.char === "{" ? "}" : "]"
              }'`,
              severity: 8,
              source: isC ? "C Syntax" : "Syntax"
            });
          }
        }
      }
    }

    // Unclosed string literal on this line
    if (inString && lang !== "python") {
      markers.push({
        startLineNumber: lineIdx + 1,
        startColumn: line.length,
        endLineNumber: lineIdx + 1,
        endColumn: line.length + 1,
        message: `Unterminated string literal`,
        severity: 8,
        source: "Syntax"
      });
    }
  }

  // Report unclosed opening brackets
  while (stack.length > 0) {
    const unclosed = stack.pop();
    markers.push({
      startLineNumber: unclosed.line,
      startColumn: unclosed.col,
      endLineNumber: unclosed.line,
      endColumn: unclosed.col + 1,
      message: `Unclosed '${unclosed.char}'`,
      severity: 8,
      source: isC ? "C Syntax" : "Syntax"
    });
  }

  // 2. Specific C/C++ Syntax: Missing semicolon check
  if (isC) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments, preprocessor directives, empty lines
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        continue;
      }

      // Check if line is a function header or control flow (if, for, while, switch, struct definition header, etc.)
      const isControlOrHeader =
        trimmed.startsWith("if ") || trimmed.startsWith("if(") ||
        trimmed.startsWith("for ") || trimmed.startsWith("for(") ||
        trimmed.startsWith("while ") || trimmed.startsWith("while(") ||
        trimmed.startsWith("switch ") || trimmed.startsWith("switch(") ||
        trimmed.endsWith("{") || trimmed.endsWith("}") ||
        trimmed.endsWith(",") || trimmed.endsWith(";") ||
        trimmed.endsWith("\\") || trimmed.endsWith(":") ||
        trimmed.startsWith("else") || trimmed.startsWith("case ") || trimmed.startsWith("default:");

      if (isControlOrHeader) continue;

      // Look at the next non-empty, non-comment line
      let nextLine = "";
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed && !nextTrimmed.startsWith("//") && !nextTrimmed.startsWith("/*") && !nextTrimmed.startsWith("*")) {
          nextLine = nextTrimmed;
          break;
        }
      }

      // If the current line appears to be a statement or declaration (e.g. variable declaration, return, assignment, call):
      const looksLikeStatement =
        trimmed.startsWith("int ") || trimmed.startsWith("char ") || trimmed.startsWith("float ") ||
        trimmed.startsWith("double ") || trimmed.startsWith("void ") || trimmed.startsWith("long ") ||
        trimmed.startsWith("short ") || trimmed.startsWith("unsigned ") || trimmed.startsWith("signed ") ||
        trimmed.startsWith("bool ") || trimmed.startsWith("return") || trimmed.startsWith("printf") ||
        trimmed.startsWith("scanf") || trimmed.includes("=") || trimmed.endsWith(")");

      // And the next line starts a new statement, return, or closing brace:
      const nextStartsNewStatement =
        !nextLine ||
        nextLine.startsWith("int ") || nextLine.startsWith("char ") || nextLine.startsWith("float ") ||
        nextLine.startsWith("double ") || nextLine.startsWith("void ") || nextLine.startsWith("long ") ||
        nextLine.startsWith("return") || nextLine.startsWith("if") || nextLine.startsWith("for") ||
        nextLine.startsWith("while") || nextLine.startsWith("printf") || nextLine.startsWith("scanf") ||
        nextLine.startsWith("}") || nextLine.includes("=");

      if (looksLikeStatement && nextStartsNewStatement) {
        markers.push({
          startLineNumber: i + 1,
          startColumn: line.length + 1,
          endLineNumber: i + 1,
          endColumn: line.length + 2,
          message: "expected ';' at end of statement",
          severity: 8, // Error
          source: "gcc"
        });
      }
    }
  }

  // 3. Python specific checks
  if (lang === "python" || filename.endsWith(".py")) {
    const blockKeywords = ["def ", "class ", "if ", "elif ", "else:", "for ", "while ", "try:", "except", "finally:", "with "];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      for (const kw of blockKeywords) {
        if (trimmed.startsWith(kw) || trimmed === kw) {
          if (!trimmed.endsWith(":")) {
            markers.push({
              startLineNumber: i + 1,
              startColumn: lines[i].length + 1,
              endLineNumber: i + 1,
              endColumn: lines[i].length + 2,
              message: `SyntaxError: expected ':' at end of '${kw.trim()}' statement`,
              severity: 8,
              source: "python"
            });
          }
          break;
        }
      }
    }
  }

  return markers;
}

/**
 * Comprehensive code diagnostics combining instant client parser and remote compiler (GCC, Python AST, etc.)
 */
export async function getCodeDiagnostics({ code, language, filename }) {
  // 1. Instant client-side markers
  const clientMarkers = checkClientSyntax(code, language, filename);

  // 2. Fetch compiler-level diagnostics from sandbox backend
  try {
    const res = await lintCode({ language, code, filename });
    if (res.success && Array.isArray(res.markers) && res.markers.length > 0) {
      // Backend GCC/compiler found authoritative markers
      return res.markers;
    }
  } catch (err) {
    // If backend is unreachable, fallback to client markers
  }

  return clientMarkers;
}
