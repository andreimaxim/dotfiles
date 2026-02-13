import { displayModelName } from "./formatting";
import { parseModel } from "./model";
import { cutoffDateKey, periodDays } from "./time";
import type { DayStats, ModelKey, Period, RGB, SessionData, Stats, UsagePalette } from "./types";

const OTHER_COLOR: RGB = { r: 160, g: 160, b: 160 };

export function computeStats(sessions: SessionData[], period: Period): Stats {
	const cutoff = cutoffDateKey(periodDays(period));

	const dayMap = new Map<string, DayStats>();
	const modelCost = new Map<ModelKey, number>();
	const modelMessages = new Map<ModelKey, number>();
	const modelTokens = new Map<ModelKey, number>();

	let sessionCount = 0;

	for (const session of sessions) {
		const inPeriod = session.messages.filter((m) => m.date >= cutoff);
		if (inPeriod.length === 0) continue;
		sessionCount += 1;

		for (const msg of inPeriod) {
			let day = dayMap.get(msg.date);
			if (!day) {
				day = { modelMessages: new Map(), totalMessages: 0, totalTokens: 0, totalCost: 0 };
				dayMap.set(msg.date, day);
			}

			day.modelMessages.set(msg.model, (day.modelMessages.get(msg.model) ?? 0) + 1);
			day.totalMessages += 1;
			day.totalTokens += msg.tokens;
			day.totalCost += msg.cost;

			modelCost.set(msg.model, (modelCost.get(msg.model) ?? 0) + msg.cost);
			modelMessages.set(msg.model, (modelMessages.get(msg.model) ?? 0) + 1);
			modelTokens.set(msg.model, (modelTokens.get(msg.model) ?? 0) + msg.tokens);
		}
	}

	const totalCost = [...modelCost.values()].reduce((a, b) => a + b, 0);
	const totalMessages = [...modelMessages.values()].reduce((a, b) => a + b, 0);
	const totalTokens = [...modelTokens.values()].reduce((a, b) => a + b, 0);

	return {
		sessionCount,
		totalMessages,
		totalTokens,
		totalCost,
		avgCost: sessionCount > 0 ? totalCost / sessionCount : 0,
		dayMap,
		modelCost,
		modelMessages,
		modelTokens,
	};
}

export function choosePalette(sessions: SessionData[], period: Period, topN = 4): UsagePalette {
	const stats = computeStats(sessions, period);

	// Aggregate tokens by family (strip provider prefix) so the same model
	// from different providers doesn't appear as separate entries.
	const familyTokens = new Map<string, number>();
	for (const [key, tokens] of stats.modelTokens) {
		const family = displayModelName(key);
		familyTokens.set(family, (familyTokens.get(family) ?? 0) + tokens);
	}

	const orderedModels = [...familyTokens.entries()]
		.filter(([, tokens]) => tokens > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, topN)
		.map(([family]) => family);

	const modelColors = new Map<string, RGB>();
	for (const family of orderedModels) {
		modelColors.set(family, parseModel(family).color);
	}

	return { modelColors, orderedModels, otherColor: OTHER_COLOR };
}
