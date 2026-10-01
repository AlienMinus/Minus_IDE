/**
 * Lightweight Emmet Abbreviation Expander for HTML/JSX/CSS
 */

const SELF_CLOSING_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

const SPECIAL_INPUTS = {
  "input:text": '<input type="text" />',
  "input:password": '<input type="password" />',
  "input:email": '<input type="email" />',
  "input:number": '<input type="number" />',
  "input:checkbox": '<input type="checkbox" />',
  "input:radio": '<input type="radio" />',
  "input:file": '<input type="file" />',
  "input:submit": '<input type="submit" value="Submit" />',
  "input:button": '<input type="button" value="Button" />',
  "button:submit": '<button type="submit">Submit</button>',
  "button:reset": '<button type="reset">Reset</button>',
  "form:post": '<form action="" method="post">\n  \n</form>',
  "form:get": '<form action="" method="get">\n  \n</form>',
  "a:link": '<a href="http://"></a>',
  "a:mail": '<a href="mailto:"></a>'
};

function parseSingleItem(str, isJsx = true) {
  const classAttr = isJsx ? "className" : "class";

  // Parse ID and classes
  // e.g. div#app.container.main
  let tag = "div";
  let id = "";
  const classes = [];

  const parts = str.match(/([.#]?[a-zA-Z0-9_-]+)/g) || [str];

  parts.forEach((part, idx) => {
    if (idx === 0 && !part.startsWith(".") && !part.startsWith("#")) {
      tag = part;
    } else if (part.startsWith("#")) {
      id = part.slice(1);
    } else if (part.startsWith(".")) {
      classes.push(part.slice(1));
    }
  });

  const attrs = [];
  if (id) attrs.push(`id="${id}"`);
  if (classes.length > 0) attrs.push(`${classAttr}="${classes.join(" ")}"`);

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  if (SELF_CLOSING_TAGS.has(tag.toLowerCase())) {
    return `<${tag}${attrStr} />`;
  }

  return `<${tag}${attrStr}>\n  \n</${tag}>`;
}

export function expandEmmetAbbreviation(abbr, isJsx = true) {
  if (!abbr || typeof abbr !== "string") return null;
  const trimmed = abbr.trim();

  if (SPECIAL_INPUTS[trimmed]) {
    return SPECIAL_INPUTS[trimmed];
  }

  // Handle multiplier: e.g. li*3 or li.item*4
  if (trimmed.includes("*")) {
    const [sub, countStr] = trimmed.split("*");
    const count = parseInt(countStr, 10);
    if (!isNaN(count) && count > 0 && count <= 50) {
      const items = [];
      for (let i = 1; i <= count; i++) {
        items.push(parseSingleItem(sub.replace(/\$/g, String(i)), isJsx));
      }
      return items.join("\n");
    }
  }

  // Handle nesting: e.g. ul>li or div>p>span
  if (trimmed.includes(">")) {
    const parts = trimmed.split(">");
    let result = "";
    let closing = "";

    parts.forEach((p, idx) => {
      const isLast = idx === parts.length - 1;
      const parsed = parseSingleItem(p, isJsx);
      const openTag = parsed.split("\n")[0];
      const closeTag = parsed.split("\n").pop();

      const indent = "  ".repeat(idx);
      if (isLast) {
        result += `${indent}${openTag}\n${indent}  \n${indent}${closeTag}\n`;
      } else {
        result += `${indent}${openTag}\n`;
        closing = `${indent}${closeTag}\n` + closing;
      }
    });

    return (result + closing).trim();
  }

  // Simple tag, class, or id: e.g. div.container, h1, section#main
  if (/^[a-zA-Z0-9#._-]+$/.test(trimmed)) {
    return parseSingleItem(trimmed, isJsx);
  }

  return null;
}

/**
 * Execute Emmet expansion on a Monaco editor instance
 */
export function executeMonacoEmmet(editor) {
  if (!editor) return false;
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return false;

  const lineContent = model.getLineContent(position.lineNumber);
  const textBeforeCursor = lineContent.slice(0, position.column - 1);

  // Match the abbreviation word right before cursor
  const match = textBeforeCursor.match(/([a-zA-Z0-9#._>:*$-]+)$/);
  if (!match) {
    editor.trigger("hyperion", "editor.action.triggerSuggest", null);
    return false;
  }

  const abbr = match[1];
  const startCol = position.column - abbr.length;
  const range = {
    startLineNumber: position.lineNumber,
    startColumn: startCol,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  };

  const isJsx = model.getLanguageId().includes("javascript") || model.getLanguageId().includes("typescript") || model.getLanguageId() === "react";
  const expanded = expandEmmetAbbreviation(abbr, isJsx);

  if (expanded) {
    editor.executeEdits("emmet", [{ range, text: expanded, forceMoveMarkers: true }]);
    return true;
  }

  // Fallback to trigger suggestion
  editor.trigger("hyperion", "editor.action.triggerSuggest", null);
  return false;
}
