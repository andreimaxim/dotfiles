import { getAgentDir, type Theme } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { join } from "node:path";
import {
	blendDayColor,
	clamp01,
	classifyDayBlend,
	colorizeRgb,
	colorizeWithThemeBg,
	DEFAULT_BG,
	mixRgb,
	parseBgAnsiRgb,
	parseColorFGBGBackgroundRgb,
} from "./colors";
import { displayModelName, formatCount } from "./formatting";
import { computeProviderCosts, type ProviderRow } from "./provider-breakdown";
import { renderProviderTable } from "./provider-table";
import { choosePalette, computeStats } from "./stats";
import { addDaysLocal, cutoffDateKey, fmtDate, localMidnight, periodDays } from "./time";
import { PERIODS, type DayStats, type Period, type SessionData, type Stats, type UsagePalette, type RGB } from "./types";

export class UsageComponent {
	private sessions: SessionData[];
	private palette: UsagePalette;
	private period: Period = "30d";
	private stats: Stats;
	private providerRows: ProviderRow[];
	private onClose: () => void;
	private tui: { requestRender(): void };
	private theme: Theme;
	private cachedLines: string[] | undefined;
	private cachedWidth = 0;

	constructor(
		tui: { requestRender(): void },
		theme: Theme,
		sessions: SessionData[],
		onClose: () => void,
	) {
		this.tui = tui;
		this.theme = theme;
		this.sessions = sessions;
		this.onClose = onClose;
		this.stats = computeStats(sessions, this.period);
		this.palette = choosePalette(sessions, this.period);
		this.providerRows = computeProviderCosts(sessions, cutoffDateKey(periodDays(this.period)));
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape) || data === "q" || data === "Q") {
			this.onClose();
			return;
		}

		if (matchesKey(data, Key.left)) {
			const idx = PERIODS.indexOf(this.period);
			if (idx > 0) {
				this.period = PERIODS[idx - 1]!;
				this.recomputeForPeriod();
			}
			return;
		}

		if (matchesKey(data, Key.right)) {
			const idx = PERIODS.indexOf(this.period);
			if (idx < PERIODS.length - 1) {
				this.period = PERIODS[idx + 1]!;
				this.recomputeForPeriod();
			}
		}
	}

	private recomputeForPeriod(): void {
		this.stats = computeStats(this.sessions, this.period);
		this.palette = choosePalette(this.sessions, this.period);
		this.providerRows = computeProviderCosts(this.sessions, cutoffDateKey(periodDays(this.period)));
		this.invalidate();
		this.tui.requestRender();
	}

	invalidate(): void {
		this.cachedLines = undefined;
		this.cachedWidth = 0;
	}

	private getCalendarBackgroundRgb(): RGB {
		const fromTheme = parseBgAnsiRgb(this.theme.getBgAnsi("toolPendingBg"));
		if (fromTheme) return fromTheme;
		const fromEnv = parseColorFGBGBackgroundRgb(process.env.COLORFGBG);
		if (fromEnv) return fromEnv;
		return DEFAULT_BG;
	}

	private getDayMixedColor(dayStats: DayStats): RGB {
		const entries: Array<{ color: RGB; count: number }> = [];
		let otherCount = 0;

		for (const [model, count] of dayStats.modelMessages.entries()) {
			if (count <= 0) continue;
			const color = this.palette.modelColors.get(displayModelName(model));
			if (color) entries.push({ color, count });
			else otherCount += count;
		}

		if (otherCount > 0) entries.push({ color: this.palette.otherColor, count: otherCount });
		return blendDayColor(classifyDayBlend(entries, this.palette.otherColor));
	}

	private renderCalendar(lines: string[], width: number): void {
		const days = periodDays(this.period);
		const now = new Date();
		const t = this.theme;

		const startDate = addDaysLocal(localMidnight(now), -(days - 1));
		const startDow = (startDate.getDay() + 6) % 7; // Mon=0
		const firstMon = addDaysLocal(startDate, -startDow);

		const grid: (DayStats | "" | null)[][] = Array.from({ length: 7 }, () => []);
		let maxCol = 0;

		for (let i = 0; i < days; i++) {
			const d = addDaysLocal(startDate, i);
			const dateStr = fmtDate(d);
			const row = (d.getDay() + 6) % 7;
			const daysSinceFirstMon = Math.round((d.getTime() - firstMon.getTime()) / 86_400_000);
			const col = Math.floor(daysSinceFirstMon / 7);

			while (grid[row]!.length <= col) grid[row]!.push(null);
			maxCol = Math.max(maxCol, col);

			const dayStats = this.stats.dayMap.get(dateStr);
			grid[row]![col] = dayStats ?? "";
		}

		for (let row = 0; row < 7; row++) {
			while (grid[row]!.length <= maxCol) grid[row]!.push(null);
		}

		const dayLabels = ["Mon", "   ", "Wed", "   ", "Fri", "   ", "   "];
		const calendarRows: string[] = [];
		const maxMessages = Math.max(0, ...[...this.stats.dayMap.values()].map((d) => d.totalMessages));
		const denom = Math.log1p(Math.max(0, maxMessages));
		const minVisible = 0.2;
		const bg = this.getCalendarBackgroundRgb();

		for (let row = 0; row < 7; row++) {
			let line = t.fg("text", dayLabels[row]!) + "  ";
			for (let col = 0; col <= maxCol; col++) {
				const cell = grid[row]![col];
				if (cell === null || cell === undefined) {
					line += "   ";
				} else if (cell === "") {
					line += t.bg("toolPendingBg", "  ") + " ";
				} else {
					const hue = this.getDayMixedColor(cell);
					const value = cell.totalMessages;
					const scaled = denom > 0 ? Math.log1p(value) / denom : 0;
					const intensity = minVisible + (1 - minVisible) * clamp01(scaled);
					const rgb = mixRgb(bg, hue, intensity);
					line += colorizeRgb(rgb, "██") + " ";
				}
			}
			calendarRows.push(line);
		}

		const legendRows = Array.from({ length: 7 }, () => "");
		legendRows[0] = t.fg("dim", "Legend");

		const legendModels = this.palette.orderedModels.slice(0, 4);
		for (let i = 0; i < legendModels.length; i++) {
			const model = legendModels[i]!;
			const color = this.palette.modelColors.get(model) ?? this.palette.otherColor;
			legendRows[i + 1] = `${colorizeRgb(color, "■")} ${displayModelName(model)}`;
		}

		const nextRow = legendModels.length + 1;
		legendRows[nextRow] = `${colorizeRgb(this.palette.otherColor, "■")} ${t.fg("dim", "other")}`;
		legendRows[nextRow + 1] = `${colorizeWithThemeBg(this.theme, "toolPendingBg", "■")} ${t.fg("dim", "no usage")}`;

		const spacer = "   ";
		const calendarWidth = Math.max(...calendarRows.map((row) => visibleWidth(row)));
		const minLegendWidth = 18;
		const legendColumnWidth = Math.max(0, width - calendarWidth - visibleWidth(spacer));
		const showInlineLegend = legendColumnWidth >= minLegendWidth;

		for (let row = 0; row < 7; row++) {
			const calendarLine = calendarRows[row]!;
			if (showInlineLegend) {
				const legendLine = truncateToWidth(legendRows[row]!, legendColumnWidth, "");
				if (legendLine.length > 0) {
					lines.push(truncateToWidth(`${calendarLine}${spacer}${legendLine}`, width));
					continue;
				}
			}
			lines.push(truncateToWidth(calendarLine, width));
		}
	}

	private renderTable(lines: string[], width: number): void {
		lines.push(...renderProviderTable(this.providerRows, this.theme, width));
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

		const lines: string[] = [];
		const t = this.theme;
		const s = this.stats;
		const pDays = periodDays(this.period);

		const tabs = PERIODS.map((p) => (p === this.period ? t.bold(`[${p}]`) : t.fg("dim", p))).join("  ");
		lines.push(truncateToWidth(`${t.bold("Session breakdown")}    ${tabs}    ${t.fg("dim", "←/→ to switch · q to close")}`, width));
		lines.push(truncateToWidth(t.fg("dim", `Sessions directory: ${join(getAgentDir(), "sessions")}`), width));
		lines.push("");

		if (s.sessionCount === 0) {
			lines.push(truncateToWidth(t.fg("warning", `No sessions found in the last ${pDays} days.`), width));
			this.cachedLines = lines;
			this.cachedWidth = width;
			return lines;
		}

		lines.push(
			truncateToWidth(
				t.fg(
					"success",
					`Last ${pDays} days: ${s.sessionCount} sessions · ${formatCount(s.totalMessages)} msgs · $${s.totalCost.toFixed(2)} · avg $${s.avgCost.toFixed(3)}/session`,
				),
				width,
			),
		);
		lines.push("");
		lines.push(truncateToWidth(t.fg("dim", "Graph: color = model mix, brightness = message count"), width));
		lines.push("");

		this.renderCalendar(lines, width);
		lines.push("");
		this.renderTable(lines, width);

		this.cachedLines = lines;
		this.cachedWidth = width;
		return lines;
	}
}
