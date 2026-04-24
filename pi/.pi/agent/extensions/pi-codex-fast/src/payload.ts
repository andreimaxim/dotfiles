import { getTargetModelId } from "./model.ts";

export function patchPayload(
  payload: unknown,
  fastModelId: string,
): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const targetModelId = getTargetModelId(fastModelId);
  if (!targetModelId) {
    return undefined;
  }

  return {
    ...(payload as Record<string, unknown>),
    model: targetModelId,
    service_tier: "priority",
  };
}
