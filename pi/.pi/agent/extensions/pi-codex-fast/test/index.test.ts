import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerCodexFastExtension, type CodexFastDependencies } from "../src/index.ts";
import { FAST_MODEL_IDS, PROVIDER } from "../src/model.ts";

const FAST_MODEL_ID = FAST_MODEL_IDS[0]; // gpt-5.4-fast

describe("registerCodexFastExtension", () => {
  test("registers the fast model on startup and session start", () => {
    const handlers = new Map<string, Function>();
    const registrationCalls: {
      models: unknown[];
      options?: { replaceExisting?: boolean };
    }[] = [];
    const bootstrapModels = [{ id: "bootstrap-model" }];
    const sessionModels = [{ id: "session-model" }];

    const pi = {
      on(event: string, handler: Function) {
        handlers.set(event, handler);
      },
      registerProvider() {},
    } as unknown as ExtensionAPI;

    const dependencies = {
      createBootstrapModelRegistry: () => ({
        getAll: () => bootstrapModels,
      }),
      ensureFastModelRegistered: (_pi, models, options) => {
        registrationCalls.push({ models, options });
        return true;
      },
      isFastAliasModel: () => false,
      patchPayload: () => undefined,
    } as unknown as CodexFastDependencies;

    registerCodexFastExtension(pi, dependencies);

    assert.deepEqual(registrationCalls, [{ models: bootstrapModels, options: undefined }]);
    assert.ok(handlers.has("session_start"));
    assert.ok(handlers.has("before_provider_request"));

    const sessionStart = handlers.get("session_start");
    assert.ok(sessionStart);

    sessionStart({}, { modelRegistry: { getAll: () => sessionModels } });

    assert.deepEqual(registrationCalls, [
      { models: bootstrapModels, options: undefined },
      { models: sessionModels, options: { replaceExisting: true } },
    ]);
  });

  test("patches provider payloads only for the fast alias model", () => {
    const handlers = new Map<string, Function>();
    const patchedPayload = { model: "gpt-5.4", service_tier: "priority" };
    const patchCalls: unknown[] = [];

    const pi = {
      on(event: string, handler: Function) {
        handlers.set(event, handler);
      },
      registerProvider() {},
    } as unknown as ExtensionAPI;

    const dependencies = {
      createBootstrapModelRegistry: () => ({
        getAll: () => [],
      }),
      ensureFastModelRegistered: () => true,
      isFastAliasModel: (provider: string, modelId: string) =>
        provider === PROVIDER && modelId === FAST_MODEL_ID,
      patchPayload: (payload: unknown, modelId: string) => {
        patchCalls.push({ payload, modelId });
        return patchedPayload;
      },
    } as unknown as CodexFastDependencies;

    registerCodexFastExtension(pi, dependencies);

    const beforeProviderRequest = handlers.get("before_provider_request");
    assert.ok(beforeProviderRequest);

    const event = { payload: { model: FAST_MODEL_ID, stream: true } };
    assert.deepEqual(
      beforeProviderRequest(event, {
        model: { provider: PROVIDER, id: FAST_MODEL_ID },
      }),
      patchedPayload,
    );
        assert.deepEqual(patchCalls, [{ payload: event.payload, modelId: FAST_MODEL_ID }]);

    assert.equal(
      beforeProviderRequest(event, {
        model: { provider: PROVIDER, id: "gpt-5.4" },
      }),
      undefined,
    );
    assert.deepEqual(patchCalls, [{ payload: event.payload, modelId: FAST_MODEL_ID }]);
  });
});
