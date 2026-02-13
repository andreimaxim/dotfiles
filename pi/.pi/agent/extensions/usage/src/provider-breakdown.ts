import type { SessionData } from "./types";

export interface ProviderRow {
	provider: string;
	sessions: number;
	messages: number;
	tokens: number;
	cost: number;
	share: number;
}

function normalizeProvider(raw: string): string {
	if (raw === "openai-codex") return "openai";
	return raw;
}

function extractProvider(modelKey: string): string {
	const idx = modelKey.indexOf("/");
	const raw = idx === -1 ? modelKey : modelKey.slice(0, idx);
	return normalizeProvider(raw);
}

export function computeProviderCosts(sessions: SessionData[], cutoff: string): ProviderRow[] {
	const providerCost = new Map<string, number>();
	const providerMessages = new Map<string, number>();
	const providerTokens = new Map<string, number>();
	const providerSessions = new Map<string, Set<string>>();

	for (const session of sessions) {
		const inPeriod = session.messages.filter((m) => m.date >= cutoff);
		if (inPeriod.length === 0) continue;

		const sessionProviders = new Set<string>();
		for (const msg of inPeriod) {
			const provider = extractProvider(msg.model);
			providerCost.set(provider, (providerCost.get(provider) ?? 0) + msg.cost);
			providerMessages.set(provider, (providerMessages.get(provider) ?? 0) + 1);
			providerTokens.set(provider, (providerTokens.get(provider) ?? 0) + msg.tokens);
			sessionProviders.add(provider);
		}

		for (const prov of sessionProviders) {
			if (!providerSessions.has(prov)) providerSessions.set(prov, new Set());
			providerSessions.get(prov)!.add(session.file);
		}
	}

	const totalCost = [...providerCost.values()].reduce((a, b) => a + b, 0);
	const totalMessages = [...providerMessages.values()].reduce((a, b) => a + b, 0);
	const useCostForShare = totalCost > 0;
	const shareDenominator = useCostForShare ? totalCost : totalMessages;

	const allProviders = new Set<string>([...providerCost.keys(), ...providerMessages.keys(), ...providerTokens.keys(), ...providerSessions.keys()]);

	return [...allProviders]
		.map((provider) => {
			const cost = providerCost.get(provider) ?? 0;
			const messages = providerMessages.get(provider) ?? 0;
			const shareValue = useCostForShare ? cost : messages;
			return {
				provider,
				sessions: providerSessions.get(provider)?.size ?? 0,
				messages,
				tokens: providerTokens.get(provider) ?? 0,
				cost,
				share: shareDenominator > 0 ? Math.round((shareValue / shareDenominator) * 100) : 0,
			};
		})
		.sort((a, b) => {
			if (useCostForShare) {
				if (b.cost !== a.cost) return b.cost - a.cost;
				if (b.messages !== a.messages) return b.messages - a.messages;
				return a.provider.localeCompare(b.provider);
			}
			if (b.messages !== a.messages) return b.messages - a.messages;
			if (b.cost !== a.cost) return b.cost - a.cost;
			return a.provider.localeCompare(b.provider);
		});
}
