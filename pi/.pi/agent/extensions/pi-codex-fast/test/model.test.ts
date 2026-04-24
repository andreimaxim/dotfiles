import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  API_KEY_ENV,
  buildFastAliasProviderConfig,
  cloneProviderModel,
  FAST_MODEL_MAP,
  FAST_MODEL_IDS,
  PROVIDER,
  TARGET_MODEL_IDS,
  isFastAliasModel,
  getTargetModelId,
} from "../src/model.ts";

describe("isFastAliasModel", () => {
  test("matches only openai-codex fast aliases", () => {
    for (const fastId of FAST_MODEL_IDS) {
      assert.equal(isFastAliasModel(PROVIDER, fastId), true);
      assert.equal(isFastAliasModel("openai", fastId), false);
    }
    for (const targetId of TARGET_MODEL_IDS) {
      assert.equal(isFastAliasModel(PROVIDER, targetId), false);
    }
  });
});

describe("getTargetModelId", () => {
  test("maps fast aliases to their target models", () => {
    assert.equal(getTargetModelId("gpt-5.4-fast"), "gpt-5.4");
    assert.equal(getTargetModelId("gpt-5.5-fast"), "gpt-5.5");
    assert.equal(getTargetModelId("gpt-5.4"), undefined);
    assert.equal(getTargetModelId("unknown"), undefined);
  });
});

describe("cloneProviderModel", () => {
  test("copies the model metadata and applies id and name overrides", () => {
    const sourceModel = {
      id: "gpt-5.4",
      name: "GPT-5.4",
      provider: PROVIDER,
      api: "openai-codex-responses",
      baseUrl: "https://api.openai.com/v1",
      reasoning: true,
      input: ["text", "image"] as ("text" | "image")[],
      cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
      contextWindow: 272_000,
      maxTokens: 128_000,
      headers: { "x-test": "1" },
      compat: { supportsUsageInStreaming: true },
    };

    const clone = cloneProviderModel(sourceModel, {
      id: "gpt-5.4-fast",
      name: "GPT-5.4 (Fast)",
      cost: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 },
    });

    assert.deepEqual(clone, {
      id: "gpt-5.4-fast",
      name: "GPT-5.4 (Fast)",
      api: sourceModel.api,
      reasoning: sourceModel.reasoning,
      input: [...sourceModel.input],
      cost: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 },
      contextWindow: sourceModel.contextWindow,
      maxTokens: sourceModel.maxTokens,
      headers: { ...sourceModel.headers },
      compat: { ...sourceModel.compat },
    });
    assert.notEqual(clone.input, sourceModel.input);
    assert.notEqual(clone.cost, sourceModel.cost);
    assert.notEqual(clone.headers, sourceModel.headers);
    assert.notEqual(clone.compat, sourceModel.compat);
  });
});

describe("buildFastAliasProviderConfig", () => {
  const gpt54Model = {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: PROVIDER,
    api: "openai-codex-responses",
    baseUrl: "https://api.openai.com/v1",
    reasoning: true,
    input: ["text", "image"] as ("text" | "image")[],
    cost: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 },
    contextWindow: 272_000,
    maxTokens: 128_000,
    headers: { "x-test": "1" },
    compat: { supportsUsageInStreaming: true },
  };

  const gpt55Model = {
    ...gpt54Model,
    id: "gpt-5.5",
    name: "GPT-5.5",
    cost: { input: 2, output: 4, cacheRead: 6, cacheWrite: 8 },
  };

  test("adds fast aliases for all available target models", () => {
    const providerConfig = buildFastAliasProviderConfig([gpt54Model, gpt55Model]);
    assert.ok(providerConfig);
    assert.equal(providerConfig.baseUrl, gpt54Model.baseUrl);
    assert.equal(providerConfig.apiKey, API_KEY_ENV);
    assert.equal(providerConfig.api, gpt54Model.api);
    assert.equal(providerConfig.models?.length, 4); // 2 base + 2 fast

    const fast54 = providerConfig.models?.find((model) => model.id === "gpt-5.4-fast");
    assert.ok(fast54);
    assert.equal(fast54.name, "GPT-5.4 (Fast)");
    assert.deepEqual(fast54.cost, {
      input: gpt54Model.cost.input * 2,
      output: gpt54Model.cost.output * 2,
      cacheRead: gpt54Model.cost.cacheRead * 2,
      cacheWrite: gpt54Model.cost.cacheWrite * 2,
    });

    const fast55 = providerConfig.models?.find((model) => model.id === "gpt-5.5-fast");
    assert.ok(fast55);
    assert.equal(fast55.name, "GPT-5.5 (Fast)");
    assert.deepEqual(fast55.cost, {
      input: gpt55Model.cost.input * 2,
      output: gpt55Model.cost.output * 2,
      cacheRead: gpt55Model.cost.cacheRead * 2,
      cacheWrite: gpt55Model.cost.cacheWrite * 2,
    });
  });

  test("creates fast alias for single available target model", () => {
    const providerConfig = buildFastAliasProviderConfig([gpt54Model]);
    assert.ok(providerConfig);
    assert.equal(providerConfig.models?.length, 2); // 1 base + 1 fast

    const fast54 = providerConfig.models?.find((model) => model.id === "gpt-5.4-fast");
    assert.ok(fast54);
    assert.equal(providerConfig.models?.find((model) => model.id === "gpt-5.5-fast"), undefined);
  });

  test("skips registration when all aliases exist unless replacement is forced", () => {
    const allModels = [
      gpt54Model,
      gpt55Model,
      { ...gpt54Model, id: "gpt-5.4-fast" },
      { ...gpt55Model, id: "gpt-5.5-fast" },
    ];

    assert.equal(buildFastAliasProviderConfig(allModels), undefined);

    const providerConfig = buildFastAliasProviderConfig(allModels, { replaceExisting: true });
    assert.ok(providerConfig);
    assert.equal(providerConfig.models?.filter((m) => m.id === "gpt-5.4-fast").length, 1);
    assert.equal(providerConfig.models?.filter((m) => m.id === "gpt-5.5-fast").length, 1);
  });
});
