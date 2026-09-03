import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  getAvailableProfiles,
  readProfile,
  parseModelSelector,
  applyProfile,
  saveCurrentRolesToProfile,
} from "../src/profile-manager";
import type { ExtensionAPI, ExtensionContext, ModelSpec } from "../src/types";

describe("Profile Manager", () => {
  const testDir = path.join(os.tmpdir(), `omp-profile-mgr-test-${Date.now()}`);
  const profilesDir = path.join(testDir, "model-profiles");
  const configFile = path.join(testDir, "config.yml");

  beforeEach(() => {
    fs.mkdirSync(profilesDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("parseModelSelector", () => {
    it("parses model without thinking suffix", () => {
      const parsed = parseModelSelector("anthropic/claude-sonnet-4-6");
      expect(parsed.modelSpec).toBe("anthropic/claude-sonnet-4-6");
      expect(parsed.thinkingLevel).toBeUndefined();
    });

    it("parses model with thinking suffix", () => {
      const parsed = parseModelSelector("anthropic/claude-sonnet-4-6:high");
      expect(parsed.modelSpec).toBe("anthropic/claude-sonnet-4-6");
      expect(parsed.thinkingLevel).toBe("high");
    });

    it("handles complex names with colons not in known thinking levels", () => {
      const parsed = parseModelSelector("ollama/qwen2.5:32b");
      expect(parsed.modelSpec).toBe("ollama/qwen2.5:32b");
      expect(parsed.thinkingLevel).toBeUndefined();
    });
  });

  describe("getAvailableProfiles and readProfile", () => {
    it("discovers .yml and .yaml files in directory", () => {
      fs.writeFileSync(
        path.join(profilesDir, "anthropic.yml"),
        "modelRoles:\n  default: anthropic/claude-sonnet-4-6:high\n"
      );
      fs.writeFileSync(
        path.join(profilesDir, "chinese.yaml"),
        "modelRoles:\n  default: deepseek/flash:low\n"
      );

      const profiles = getAvailableProfiles(profilesDir);
      expect(Object.keys(profiles).sort()).toEqual(["anthropic", "chinese"]);
    });

    it("reads model roles from profile", () => {
      const pPath = path.join(profilesDir, "test.yml");
      fs.writeFileSync(
        pPath,
        "modelRoles:\n  default: anthropic/claude-sonnet-4-6:high\n  slow: anthropic/opus:max\n"
      );

      const data = readProfile(pPath);
      expect(data).toBeDefined();
      expect(data?.modelRoles.default).toBe("anthropic/claude-sonnet-4-6:high");
      expect(data?.modelRoles.slow).toBe("anthropic/opus:max");
    });
  });

  describe("applyProfile", () => {
    it("switches model and installs in-memory settings runtime overrides without modifying disk", async () => {
      const profilePath = path.join(profilesDir, "antigravity.yml");
      fs.writeFileSync(
        profilePath,
        "modelRoles:\n  default: google-antigravity/gemini-3.8-flash:high\n  slow: 9router/deepseek:max\n"
      );

      let appliedModel: ModelSpec | undefined;
      let appliedThinking: string | undefined;
      let overriddenKey: string | undefined;
      let overriddenValue: unknown;

      const mockPi: ExtensionAPI = {
        registerCommand: () => {},
        setModel: async (model) => {
          appliedModel = model;
          return true;
        },
        setThinkingLevel: (level) => {
          appliedThinking = level;
        },
        pi: {
          settings: {
            override: (path, value) => {
              overriddenKey = path;
              overriddenValue = value;
            },
          },
        },
      };

      const mockCtx: ExtensionContext = {
        hasUI: true,
        ui: {
          select: async () => undefined,
          notify: () => {},
        },
        models: {
          list: () => [
            { id: "gemini-3.8-flash", provider: "google-antigravity" },
          ],
          resolve: (spec) => {
            if (spec === "google-antigravity/gemini-3.8-flash") {
              return { id: "gemini-3.8-flash", provider: "google-antigravity" };
            }
            return undefined;
          },
        },
      };

      const result = await applyProfile({
        name: "antigravity",
        profilePath,
        configFile,
        pi: mockPi,
        ctx: mockCtx,
      });

      expect(result.success).toBe(true);
      expect(appliedModel?.id).toBe("gemini-3.8-flash");
      expect(appliedThinking).toBe("high");
      expect(overriddenKey).toBe("modelRoles");
      expect(overriddenValue).toEqual({
        default: "google-antigravity/gemini-3.8-flash:high",
        slow: "9router/deepseek:max",
      });
      // Global config file should NOT be touched, keeping instances isolated
      expect(fs.existsSync(configFile)).toBe(false);
    });
  });

  describe("saveCurrentRolesToProfile", () => {
    it("extracts modelRoles from active settings or config and writes to new profile file", () => {
      fs.writeFileSync(
        configFile,
        "setupVersion: 1\nmodelRoles:\n  default: openai/gpt-5.3-codex:auto\n  slow: openai/gpt-5.4-pro:high\n"
      );

      const res = saveCurrentRolesToProfile(configFile, profilesDir, "my-custom-profile");
      expect(res.success).toBe(true);
      expect(fs.existsSync(path.join(profilesDir, "my-custom-profile.yml"))).toBe(true);

      const profileContent = fs.readFileSync(
        path.join(profilesDir, "my-custom-profile.yml"),
        "utf-8"
      );
      expect(profileContent).toContain("default: openai/gpt-5.3-codex:auto");
      expect(profileContent).toContain("slow: openai/gpt-5.4-pro:high");
    });
  });
});
