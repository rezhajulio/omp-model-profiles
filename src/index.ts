import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI, ExtensionContext, ExtensionUISelectItem } from "./types";
import {
  applyProfile,
  getAvailableProfiles,
  readProfile,
  saveCurrentRolesToProfile,
} from "./profile-manager";

export * from "./types";
export * from "./yaml-utils";
export * from "./profile-manager";

function getProfilesDir(): string {
  return process.env.OMP_MODEL_PROFILES_DIR || path.join(os.homedir(), ".omp", "model-profiles");
}

function getConfigFile(): string {
  return process.env.OMP_CONFIG_FILE || path.join(os.homedir(), ".omp", "agent", "config.yml");
}

export default function (pi: ExtensionAPI) {
  const handler = async (rawArgs: string, ctx: ExtensionContext) => {
    const args = rawArgs.trim();
    const profilesDir = getProfilesDir();
    const configFile = getConfigFile();
    const profiles = getAvailableProfiles(profilesDir);
    const profileNames = Object.keys(profiles);

    if (profileNames.length === 0 && !args.startsWith("save ")) {
      if (ctx.hasUI) {
        ctx.ui.notify(
          `No profiles found in ${profilesDir}. Use '/profile save <name>' to save your current config as a profile.`,
          "warning"
        );
      }
      return;
    }

    // Subcommand: list
    if (args === "list") {
      if (ctx.hasUI) {
        ctx.ui.notify(`Available profiles: ${profileNames.join(", ")}`, "info");
      }
      return;
    }

    // Subcommand: show <name>
    if (args.startsWith("show ")) {
      const target = args.slice(5).trim();
      const profilePath = profiles[target];
      if (!profilePath) {
        if (ctx.hasUI) {
          ctx.ui.notify(`Profile "${target}" not found.`, "error");
        }
        return;
      }
      const data = readProfile(profilePath);
      const rolesSummary = data?.modelRoles
        ? Object.entries(data.modelRoles)
            .map(([r, m]) => `  ${r}: ${m}`)
            .join("\n")
        : "  (no roles defined)";
      if (ctx.hasUI) {
        ctx.ui.notify(`Profile "${target}":\n${rolesSummary}`, "info");
      }
      return;
    }

    // Subcommand: save <name>
    if (args.startsWith("save ")) {
      const targetName = args.slice(5).trim();
      if (!targetName) {
        if (ctx.hasUI) ctx.ui.notify("Usage: /profile save <name>", "warning");
        return;
      }

      const result = saveCurrentRolesToProfile(configFile, profilesDir, targetName);
      if (ctx.hasUI) {
        if (result.success) {
          ctx.ui.notify(`✓ Saved current model roles to ${result.path}`, "success");
        } else {
          ctx.ui.notify(`Failed to save profile: ${result.error}`, "error");
        }
      }
      return;
    }

    // If a specific profile name was passed directly: /profile anthropic
    if (args.length > 0) {
      const profilePath = profiles[args];
      if (!profilePath) {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `Profile "${args}" not found. Available: ${profileNames.join(", ")}`,
            "error"
          );
        }
        return;
      }

      const result = await applyProfile({
        name: args,
        profilePath,
        configFile,
        pi,
        ctx,
      });

      if (ctx.hasUI) {
        if (result.success && result.model) {
          const thinkingSuffix = result.thinkingLevel ? `:${result.thinkingLevel}` : "";
          ctx.ui.notify(
            `✓ Switched to profile "${args}" (${result.model.provider}/${result.model.id}${thinkingSuffix})`,
            "success"
          );
        } else {
          ctx.ui.notify(`Failed to switch profile: ${result.error}`, "error");
        }
      }
      return;
    }

    // No args provided: Open interactive picker dialog
    if (!ctx.hasUI) return;

    const options: ExtensionUISelectItem[] = [];
    for (const [name, profilePath] of Object.entries(profiles)) {
      const data = readProfile(profilePath);
      const defaultRole = data?.modelRoles?.["default"] ?? "unspecified";
      const slowRole = data?.modelRoles?.["slow"];
      const desc = slowRole
        ? `default: ${defaultRole} | slow: ${slowRole}`
        : `default: ${defaultRole}`;
      options.push({
        label: name,
        description: desc,
      });
    }

    const selected = await ctx.ui.select("Select Model Profile", options);
    if (!selected) return;

    const selectedPath = profiles[selected];
    if (selectedPath) {
      const result = await applyProfile({
        name: selected,
        profilePath: selectedPath,
        configFile,
        pi,
        ctx,
      });

      if (ctx.hasUI) {
        if (result.success && result.model) {
          const thinkingSuffix = result.thinkingLevel ? `:${result.thinkingLevel}` : "";
          ctx.ui.notify(
            `✓ Switched to profile "${selected}" (${result.model.provider}/${result.model.id}${thinkingSuffix})`,
            "success"
          );
        } else {
          ctx.ui.notify(`Failed to switch profile: ${result.error}`, "error");
        }
      }
    }
  };

  pi.registerCommand("profile", {
    description: "Switch model profile interactively or by name (/profile [name|list|show|save])",
    handler,
  });

  pi.registerCommand("model-profile", {
    description: "Alias for /profile",
    handler,
  });
}
