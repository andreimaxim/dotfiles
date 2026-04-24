/**
 * Codex Fast Extension.
 *
 * Adds `openai-codex/gpt-5.4-fast` as a selectable alias model and rewrites
 * requests for that alias to `gpt-5.4` with `service_tier: "priority"`.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  createBootstrapModelRegistry,
  ensureFastModelRegistered,
  isFastAliasModel,
} from "./model.ts";
import { patchPayload } from "./payload.ts";

export interface CodexFastDependencies {
  createBootstrapModelRegistry: typeof createBootstrapModelRegistry;
  ensureFastModelRegistered: typeof ensureFastModelRegistered;
  isFastAliasModel: typeof isFastAliasModel;
  patchPayload: typeof patchPayload;
}

const defaultDependencies: CodexFastDependencies = {
  createBootstrapModelRegistry,
  ensureFastModelRegistered,
  isFastAliasModel,
  patchPayload,
};

export function registerCodexFastExtension(
  pi: ExtensionAPI,
  dependencies: CodexFastDependencies = defaultDependencies,
) {
  const {
    createBootstrapModelRegistry,
    ensureFastModelRegistered,
    isFastAliasModel,
    patchPayload,
  } = dependencies;

  ensureFastModelRegistered(pi, createBootstrapModelRegistry().getAll());

  pi.on("session_start", (_event, ctx) => {
    ensureFastModelRegistered(pi, ctx.modelRegistry.getAll(), { replaceExisting: true });
  });

  pi.on("before_provider_request", (event, ctx) => {
    const model = ctx.model;
    if (!model || !isFastAliasModel(model.provider, model.id)) {
      return;
    }

    return patchPayload(event.payload, model.id);
  });
}

export default function codexFastExtension(pi: ExtensionAPI) {
  registerCodexFastExtension(pi);
}
