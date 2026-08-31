import * as fs from "node:fs";

/**
 * Parses a simple YAML string into a key-value object.
 * Supports top-level keys, nested objects, strings, numbers, booleans, and comments.
 */
export function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentObj: Record<string, unknown> | null = null;

  for (let rawLine of lines) {
    const commentIdx = rawLine.indexOf("#");
    if (commentIdx !== -1) {
      rawLine = rawLine.slice(0, commentIdx);
    }
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const isIndented = rawLine.startsWith("  ") || rawLine.startsWith("\t");

    if (!isIndented) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();

      if (valStr === "" || valStr === "{}") {
        currentObj = {};
        result[key] = currentObj;
      } else {
        currentObj = null;
        result[key] = parseYamlScalar(valStr);
      }
    } else if (currentObj !== null) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;

      const subKey = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();
      currentObj[subKey] = parseYamlScalar(valStr);
    }
  }

  return result;
}

/**
 * Parses an individual YAML scalar value.
 */
export function parseYamlScalar(valStr: string): unknown {
  if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
    return valStr.slice(1, -1);
  }
  if (valStr === "true") return true;
  if (valStr === "false") return false;
  if (valStr === "null" || valStr === "~") return null;
  if (!Number.isNaN(Number(valStr)) && valStr !== "") {
    return Number(valStr);
  }
  return valStr;
}

/**
 * Serializes a simple object to YAML format.
 */
export function stringifySimpleYaml(data: Record<string, unknown>, indent = 0): string {
  const spaces = " ".repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${spaces}${key}: null`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      lines.push(stringifySimpleYaml(value as Record<string, unknown>, indent + 2));
    } else if (Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      for (const item of value) {
        lines.push(`${spaces}  - ${item}`);
      }
    } else if (typeof value === "string") {
      lines.push(`${spaces}${key}: ${value}`);
    } else {
      lines.push(`${spaces}${key}: ${String(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * In-place updates the `modelRoles:` block inside an existing config.yml file.
 * Preserves other settings, comments, and structure.
 */
export function updateConfigFileModelRoles(configPath: string, modelRoles: Record<string, string>): void {
  const newRolesBlock = [
    "modelRoles:",
    ...Object.entries(modelRoles).map(([k, v]) => `  ${k}: ${v}`),
  ];

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, `${newRolesBlock.join("\n")}\n`, "utf-8");
    return;
  }

  const content = fs.readFileSync(configPath, "utf-8");
  const lines = content.split("\n");

  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^modelRoles:\s*$/.test(line)) {
      startIdx = i;
      let j = i + 1;
      while (j < lines.length && (/^\s{2,}/.test(lines[j]) || /^\s*#/.test(lines[j]) || lines[j].trim() === "")) {
        if (!/^\s*#/.test(lines[j]) && lines[j].trim() !== "") {
          endIdx = j;
        }
        j++;
      }
      if (endIdx === -1) endIdx = i;
      break;
    }
  }

  if (startIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1, ...newRolesBlock);
    fs.writeFileSync(configPath, lines.join("\n"), "utf-8");
  } else {
    fs.writeFileSync(configPath, `${newRolesBlock.join("\n")}\n${content}`, "utf-8");
  }
}
