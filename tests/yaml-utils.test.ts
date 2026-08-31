import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseSimpleYaml,
  parseYamlScalar,
  stringifySimpleYaml,
  updateConfigFileModelRoles,
} from "../src/yaml-utils";

describe("YAML Utilities", () => {
  const testDir = path.join(os.tmpdir(), `omp-yaml-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("parseYamlScalar", () => {
    it("parses booleans", () => {
      expect(parseYamlScalar("true")).toBe(true);
      expect(parseYamlScalar("false")).toBe(false);
    });

    it("parses numbers", () => {
      expect(parseYamlScalar("42")).toBe(42);
      expect(parseYamlScalar("3.14")).toBe(3.14);
      expect(parseYamlScalar("-10")).toBe(-10);
    });

    it("parses null and tilde", () => {
      expect(parseYamlScalar("null")).toBeNull();
      expect(parseYamlScalar("~")).toBeNull();
    });

    it("parses quoted strings", () => {
      expect(parseYamlScalar('"hello world"')).toBe("hello world");
      expect(parseYamlScalar("'single quote'")).toBe("single quote");
    });

    it("parses plain strings", () => {
      expect(parseYamlScalar("anthropic/claude-haiku-4.5:high")).toBe(
        "anthropic/claude-haiku-4.5:high"
      );
    });
  });

  describe("parseSimpleYaml", () => {
    it("parses top level keys and comments", () => {
      const yaml = `
# Comment line
name: "my-profile" # inline comment
enabled: true
count: 10
`;
      const result = parseSimpleYaml(yaml);
      expect(result.name).toBe("my-profile");
      expect(result.enabled).toBe(true);
      expect(result.count).toBe(10);
    });

    it("parses nested objects like modelRoles", () => {
      const yaml = `
modelRoles:
  default: anthropic/claude-haiku-4.5:high
  slow: anthropic/claude-opus-5:max
  task: anthropic/claude-haiku-4.5:low
theme: dark-ocean
`;
      const result = parseSimpleYaml(yaml);
      expect(result.theme).toBe("dark-ocean");
      expect(result.modelRoles).toEqual({
        default: "anthropic/claude-haiku-4.5:high",
        slow: "anthropic/claude-opus-5:max",
        task: "anthropic/claude-haiku-4.5:low",
      });
    });
  });

  describe("stringifySimpleYaml", () => {
    it("serializes nested objects", () => {
      const data = {
        modelRoles: {
          default: "openai/gpt-4o:auto",
          slow: "openai/o3-mini:high",
        },
      };
      const str = stringifySimpleYaml(data);
      expect(str).toContain("modelRoles:");
      expect(str).toContain("  default: openai/gpt-4o:auto");
      expect(str).toContain("  slow: openai/o3-mini:high");
    });
  });

  describe("updateConfigFileModelRoles", () => {
    it("creates new file if missing", () => {
      const configFile = path.join(testDir, "config.yml");
      updateConfigFileModelRoles(configFile, {
        default: "anthropic/claude-haiku-4.5:high",
      });

      expect(fs.existsSync(configFile)).toBe(true);
      const content = fs.readFileSync(configFile, "utf-8");
      expect(content).toContain("modelRoles:");
      expect(content).toContain("default: anthropic/claude-haiku-4.5:high");
    });

    it("updates existing modelRoles block preserving surrounding keys", () => {
      const configFile = path.join(testDir, "config.yml");
      const initial = `setupVersion: 1
modelRoles: 
  tiny: google/gemini:low
  default: google/gemini:high
theme: dark-ocean
display:
  shimmer: true
`;
      fs.writeFileSync(configFile, initial, "utf-8");

      updateConfigFileModelRoles(configFile, {
        default: "anthropic/claude-haiku-4.5:high",
        slow: "anthropic/claude-opus-5:max",
      });

      const updated = fs.readFileSync(configFile, "utf-8");
      expect(updated).toContain("setupVersion: 1");
      expect(updated).toContain("theme: dark-ocean");
      expect(updated).toContain("default: anthropic/claude-haiku-4.5:high");
      expect(updated).toContain("slow: anthropic/claude-opus-5:max");
      expect(updated).not.toContain("tiny: google/gemini:low");
    });
  });
});
