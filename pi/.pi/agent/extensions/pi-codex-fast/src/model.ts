import { join } from "node:path";
import {
  AuthStorage,
  getAgentDir,
  ModelRegistry,
  type ExtensionAPI,
  type ProviderConfig,
} from "@mariozechner/pi-coding-agent";
import type { Api, Model } from "@mariozechner/pi-ai";

export const PROVIDER = "openai-codex";
export const API_KEY_ENV = "OPENAI_CODEX_API_KEY";

/** Maps fast alias model IDs to their base model IDs */
export const FAST_MODEL_MAP: Record<string, string> = {
  "gpt-5.4-fast": "gpt-5.4",
  "gpt-5.5-fast": "gpt-5.5",
};

export const FAST_MODEL_IDS = Object.keys(FAST_MODEL_MAP);
export const TARGET_MODEL_IDS = Object.values(FAST_MODEL_MAP);

export function isFastAliasModel(provider: string, modelId: string): boolean {
  return provider === PROVIDER && modelId in FAST_MODEL_MAP;
}

export function getTargetModelId(fastModelId: string): string | undefined {
  return FAST_MODEL_MAP[fastModelId];
}

export function cloneProviderModel(
  model: Model<Api>,
  overrides: Partial<Pick<Model<Api>, "id" | "name" | "cost">> = {},
) {
  return {
    id: overrides.id ?? model.id,
    name: overrides.name ?? model.name,
    api: model.api,
    reasoning: model.reasoning,
    input: [...model.input],
    cost: overrides.cost ? { ...overrides.cost } : { ...model.cost },
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    headers: model.headers ? { ...model.headers } : undefined,
    compat: model.compat ? { ...model.compat } : undefined,
  };
}

export function cloneProviderModels(models: Model<Api>[]) {
  return models.map((model) => cloneProviderModel(model));
}

export function buildFastAliasProviderConfig(
  models: Model<Api>[],
  options: { replaceExisting?: boolean } = {},
): ProviderConfig | undefined {
  const providerModels = models.filter((model) => model.provider === PROVIDER);
  const existingFastAliases = providerModels.filter((model) => model.id in FAST_MODEL_MAP);
  const baseProviderModels = providerModels.filter((model) => !(model.id in FAST_MODEL_MAP));

  if (baseProviderModels.length === 0) {
    return undefined;
  }

  // Skip if all fast aliases already exist and we're not replacing
  if (existingFastAliases.length === TARGET_MODEL_IDS.length && !options.replaceExisting) {
    return undefined;
  }

  // Find first available base model for provider config
  const firstBaseModel = baseProviderModels.find((model) => model.baseUrl);
  if (!firstBaseModel?.baseUrl) {
    return undefined;
  }

  // Build fast aliases for each target model that exists
  const fastAliases: Model<Api>[] = [];
  for (const [fastId, targetId] of Object.entries(FAST_MODEL_MAP)) {
    const targetModel = baseProviderModels.find((model) => model.id === targetId);
    if (targetModel) {
      fastAliases.push(
        cloneProviderModel(targetModel, {
          id: fastId,
          name: `${targetModel.name} (Fast)`,
          cost: {
            input: targetModel.cost.input * 2,
            output: targetModel.cost.output * 2,
            cacheRead: targetModel.cost.cacheRead * 2,
            cacheWrite: targetModel.cost.cacheWrite * 2,
          },
        }),
      );
    }
  }

  if (fastAliases.length === 0) {
    return undefined;
  }

  return {
    baseUrl: firstBaseModel.baseUrl,
    apiKey: API_KEY_ENV,
    api: firstBaseModel.api,
    models: [...cloneProviderModels(baseProviderModels), ...fastAliases],
  };
}

export function createBootstrapModelRegistry(): ModelRegistry {
  const agentDir = getAgentDir();
  return new ModelRegistry(
    AuthStorage.create(join(agentDir, "auth.json")),
    join(agentDir, "models.json"),
  );
}

export function ensureFastModelRegistered(
  pi: Pick<ExtensionAPI, "registerProvider">,
  models: Model<Api>[],
  options?: { replaceExisting?: boolean },
): boolean {
  const providerConfig = buildFastAliasProviderConfig(models, options);
  if (!providerConfig) {
    return false;
  }

  pi.registerProvider(PROVIDER, providerConfig);
  return true;
}
