/**
 * Types for OMP Model Profiles Extension
 */

export interface ModelSpec {
  id: string;
  provider: string;
  name?: string;
}

export interface ExtensionUISelectItem {
  label: string;
  description?: string;
}

export interface ExtensionUI {
  select: (
    title: string,
    options: Array<string | ExtensionUISelectItem>
  ) => Promise<string | undefined>;
  notify: (
    text: string,
    level?: "info" | "warning" | "error" | "success"
  ) => void;
}

export interface ExtensionContext {
  hasUI: boolean;
  ui: ExtensionUI;
  model?: ModelSpec;
  models: {
    list: () => ModelSpec[];
    resolve: (spec: string) => ModelSpec | undefined;
  };
  sessionManager?: {
    appendModelChange?: (model: string, role?: string) => string;
    getSessionId?: () => string;
  };
  [key: string]: unknown;
}

export interface ExtensionAPI {
  registerCommand: (
    name: string,
    options: {
      description?: string;
      handler: (args: string, ctx: ExtensionContext) => Promise<void> | void;
    }
  ) => void;
  setModel: (model: ModelSpec) => Promise<boolean>;
  setThinkingLevel: (level: string) => void;
  pi?: {
    settings?: {
      setModelRole: (role: string, modelId: string | undefined) => void;
    };
    Settings?: {
      instance?: {
        setModelRole: (role: string, modelId: string | undefined) => void;
      };
    };
  };
}

export interface ProfileData {
  modelRoles: Record<string, string>;
  [key: string]: unknown;
}

export interface ParsedModelSelector {
  modelSpec: string;
  thinkingLevel?: string;
}

export interface ApplyProfileOptions {
  name: string;
  profilePath: string;
  configFile: string;
  pi: ExtensionAPI;
  ctx: ExtensionContext;
}

export interface ApplyProfileResult {
  success: boolean;
  model?: ModelSpec;
  thinkingLevel?: string;
  error?: string;
}
