import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import registerExtension from "../src/index";
import type { ExtensionAPI, ExtensionContext, ModelSpec } from "../src/types";

describe("Extension Command Handlers", () => {
  const testDir = path.join(os.tmpdir(), `omp-ext-test-${Date.now()}`);
  const profilesDir = path.join(testDir, "model-profiles");
  const configFile = path.join(testDir, "config.yml");

  let originalProfilesDir: string | undefined;
  let originalConfigFile: string | undefined;

  beforeEach(() => {
    fs.mkdirSync(profilesDir, { recursive: true });
    originalProfilesDir = process.env.OMP_MODEL_PROFILES_DIR;
    originalConfigFile = process.env.OMP_CONFIG_FILE;
    process.env.OMP_MODEL_PROFILES_DIR = profilesDir;
    process.env.OMP_CONFIG_FILE = configFile;
  });

  afterEach(() => {
    process.env.OMP_MODEL_PROFILES_DIR = originalProfilesDir;
    process.env.OMP_CONFIG_FILE = originalConfigFile;
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("registers /profile and /model-profile commands", () => {
    const registered: Record<string, { description?: string; handler: Function }> = {};

    const mockPi: ExtensionAPI = {
      registerCommand: (name, options) => {
        registered[name] = options;
      },
      setModel: async () => true,
      setThinkingLevel: () => {},
    };

    registerExtension(mockPi);

    expect(registered["profile"]).toBeDefined();
    expect(registered["model-profile"]).toBeDefined();
  });

  it("handles /profile list", async () => {
    fs.writeFileSync(
      path.join(profilesDir, "anthropic.yml"),
      "modelRoles:\n  default: anthropic/claude:high\n"
    );

    let commandHandler: Function | undefined;
    const mockPi: ExtensionAPI = {
      registerCommand: (name, options) => {
        if (name === "profile") commandHandler = options.handler;
      },
      setModel: async () => true,
      setThinkingLevel: () => {},
    };

    registerExtension(mockPi);

    let notifiedMessage = "";
    const mockCtx: ExtensionContext = {
      hasUI: true,
      ui: {
        select: async () => undefined,
        notify: (msg) => {
          notifiedMessage = msg;
        },
      },
      models: {
        list: () => [],
        resolve: () => undefined,
      },
    };

    await commandHandler!("list", mockCtx);
    expect(notifiedMessage).toContain("anthropic");
  });

  it("handles /profile <name> direct switch", async () => {
    fs.writeFileSync(
      path.join(profilesDir, "chinese.yml"),
      "modelRoles:\n  default: 9router/deepseek-v4-flash:high\n"
    );

    let commandHandler: Function | undefined;
    let switchedModel: ModelSpec | undefined;
    let switchedThinking: string | undefined;

    const mockPi: ExtensionAPI = {
      registerCommand: (name, options) => {
        if (name === "profile") commandHandler = options.handler;
      },
      setModel: async (model) => {
        switchedModel = model;
        return true;
      },
      setThinkingLevel: (level) => {
        switchedThinking = level;
      },
    };

    registerExtension(mockPi);

    let notifiedMessage = "";
    const mockCtx: ExtensionContext = {
      hasUI: true,
      ui: {
        select: async () => undefined,
        notify: (msg) => {
          notifiedMessage = msg;
        },
      },
      models: {
        list: () => [],
        resolve: (spec) => {
          if (spec === "9router/deepseek-v4-flash") {
            return { id: "deepseek-v4-flash", provider: "9router" };
          }
          return undefined;
        },
      },
    };

    await commandHandler!("chinese", mockCtx);
    expect(switchedModel?.id).toBe("deepseek-v4-flash");
    expect(switchedThinking).toBe("high");
    expect(notifiedMessage).toContain("Switched to profile");
  });
});
