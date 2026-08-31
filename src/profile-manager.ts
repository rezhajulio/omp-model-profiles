import * as fs from "node:fs";
import * as path from "node:path";
import { parseSimpleYaml, stringifySimpleYaml, updateConfigFileModelRoles } from "./yaml-utils";
import type {
  ApplyProfileOptions,
  ApplyProfileResult,
  ModelSpec,
  ParsedModelSelector,
  ProfileData,
} from "./types";

const KNOWN_THINKING_LEVELS: Record<string, true> = {
  none: true,
  low: true,
  medium: true,
  high: true,
  max: true,
  auto: true,
};

/**
 * Scans a directory for .yml and .yaml profile files.
 */
export function getAvailableProfiles(profilesDir: string): Record<string, string> {
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
  const profiles: Record<string, string> = {};
  try {
    const files = fs.readdirSync(profilesDir);
    for (const file of files) {
      if (file.endsWith(".yml") || file.endsWith(".yaml")) {
        const name = file.replace(/\.ya?ml$/, "");
        profiles[name] = path.join(profilesDir, file);
      }
    }
  } catch {
    // Ignore read errors
  }
  return profiles;
}

/**
 * Reads and parses a model profile file.
 */
export function readProfile(filePath: string): ProfileData | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseSimpleYaml(content);
    if (parsed.modelRoles && typeof parsed.modelRoles === "object") {
      const roles: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.modelRoles as Record<string, unknown>)) {
        if (typeof v === "string") roles[k] = v;
      }
      return { modelRoles: roles, ...parsed };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parses a model selector string (e.g. "anthropic/claude-haiku-4.5:high")
 * into base model string and optional thinking level.
 */
export function parseModelSelector(selector: string): ParsedModelSelector {
  const parts = selector.split(":");
  if (parts.length > 1) {
    const thinking = parts[parts.length - 1];
    if (KNOWN_THINKING_LEVELS[thinking]) {
      return {
        modelSpec: parts.slice(0, -1).join(":"),
        thinkingLevel: thinking,
      };
    }
  }
  return { modelSpec: selector };
}

/**
 * Applies a profile to the active OMP session and updates all in-memory and persisted roles.
 */
export async function applyProfile(options: ApplyProfileOptions): Promise<ApplyProfileResult> {
  const { name, profilePath, configFile, pi, ctx } = options;
  const data = readProfile(profilePath);

  if (!data || !data.modelRoles) {
    return {
      success: false,
      error: `Failed to read profile "${name}": invalid YAML or missing modelRoles`,
    };
  }

  const modelRoles = data.modelRoles;
  const defaultSelector = modelRoles["default"] ?? modelRoles["main"];

  if (!defaultSelector) {
    return {
      success: false,
      error: `Profile "${name}" has no "default" modelRole configured.`,
    };
  }

  const { modelSpec, thinkingLevel } = parseModelSelector(defaultSelector);

  // Resolve model in OMP
  let resolvedModel: ModelSpec | undefined = ctx.models.resolve(modelSpec);
  if (!resolvedModel) {
    const available = ctx.models.list();
    resolvedModel = available.find(
      (m) =>
        `${m.provider}/${m.id}` === modelSpec ||
        m.id === modelSpec ||
        m.name === modelSpec
    );
  }

  if (!resolvedModel) {
    return {
      success: false,
      error: `Model "${modelSpec}" from profile "${name}" could not be resolved or has no credentials.`,
    };
  }

  // 1. Switch active session model and thinking level
  try {
    const setSuccess = await pi.setModel(resolvedModel);
    if (setSuccess === false) {
      return {
        success: false,
        error: `Could not switch to model "${modelSpec}": missing or invalid API credentials.`,
      };
    }
    if (thinkingLevel) {
      pi.setThinkingLevel(thinkingLevel);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to switch model to ${modelSpec}: ${msg}`,
    };
  }

  // 2. Update all roles in-memory through Settings singleton if available (which also updates config.yml)
  let settingsUpdated = false;
  const settingsObj = pi.pi?.settings ?? pi.pi?.Settings?.instance;
  if (settingsObj && typeof settingsObj.setModelRole === "function") {
    try {
      for (const [role, selector] of Object.entries(modelRoles)) {
        settingsObj.setModelRole(role, selector);
      }
      settingsUpdated = true;
    } catch {
      settingsUpdated = false;
    }
  }

  if (!settingsUpdated) {
    // Fallback: update config.yml file on disk
    try {
      updateConfigFileModelRoles(configFile, modelRoles);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: true,
        model: resolvedModel,
        thinkingLevel,
        error: `Applied active model but failed to save config.yml: ${msg}`,
      };
    }
  }

  return {
    success: true,
    model: resolvedModel,
    thinkingLevel,
  };
}

/**
 * Saves current model roles from config.yml into a profile YAML file.
 */
export function saveCurrentRolesToProfile(
  configPath: string,
  profilesDir: string,
  targetName: string
): { success: boolean; path?: string; error?: string } {
  try {
    let currentRoles: Record<string, string> = {};
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = parseSimpleYaml(content);
      if (parsed.modelRoles && typeof parsed.modelRoles === "object") {
        for (const [k, v] of Object.entries(parsed.modelRoles as Record<string, unknown>)) {
          if (typeof v === "string") currentRoles[k] = v;
        }
      }
    }

    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    const cleanName = targetName.replace(/\.ya?ml$/, "");
    const targetPath = path.join(profilesDir, `${cleanName}.yml`);

    const fileContent = [
      `# ${cleanName} model profile`,
      stringifySimpleYaml({ modelRoles: currentRoles }),
      "",
    ].join("\n");

    fs.writeFileSync(targetPath, fileContent, "utf-8");
    return { success: true, path: targetPath };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
