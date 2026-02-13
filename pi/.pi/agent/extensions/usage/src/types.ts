export const PERIODS = ["7d", "30d", "90d"] as const;
export type Period = (typeof PERIODS)[number];

export type ModelKey = string; // "provider/model"

export interface AssistantMsg {
	model: ModelKey;
	cost: number;
	tokens: number;
	date: string; // YYYY-MM-DD (local)
}

export interface SessionData {
	file: string;
	messages: AssistantMsg[];
}

export interface DayStats {
	modelMessages: Map<ModelKey, number>;
	totalMessages: number;
	totalTokens: number;
	totalCost: number;
}

export interface Stats {
	sessionCount: number;
	totalMessages: number;
	totalTokens: number;
	totalCost: number;
	avgCost: number;
	dayMap: Map<string, DayStats>;
	modelCost: Map<ModelKey, number>;
	modelMessages: Map<ModelKey, number>;
	modelTokens: Map<ModelKey, number>;
}

export interface RGB {
	r: number;
	g: number;
	b: number;
}

export interface OkLab {
	L: number;
	a: number;
	b: number;
}

export type DayBlend =
	| { kind: "pure"; color: RGB }
	| { kind: "dominant"; primary: RGB; tint: RGB }
	| { kind: "balanced"; first: RGB; second: RGB; ratio: number; accent?: RGB }

export interface UsagePalette {
	modelColors: Map<ModelKey, RGB>;
	orderedModels: ModelKey[];
	otherColor: RGB;
}

export type UsageProgressPhase = "scan" | "parse" | "finalize";

export interface UsageProgressState {
	phase: UsageProgressPhase;
	foundFiles: number;
	parsedFiles: number;
	totalFiles: number;
	currentFile?: string;
}
