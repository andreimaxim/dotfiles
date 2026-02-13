/**
 * Session Usage Extension - shows session cost/usage breakdown.
 *
 * Command: /usage
 * Displays a calendar heatmap of model usage per day and a provider cost table.
 * Switch between 7d / 30d / 90d views with ←/→ arrows.
 */

import { BorderedLoader, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { formatCount } from "./formatting";
import { setBorderedLoaderMessage } from "./loader-utils";
import { collectSessions } from "./session-collector";
import { choosePalette } from "./stats";
import type { SessionData, UsageProgressState } from "./types";
import { UsageComponent } from "./usage-component";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("usage", {
		description: "Show session usage breakdown (cost, models, calendar heatmap)",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Usage view requires interactive mode", "error");
				return;
			}

			let aborted = false;
			const sessions = await ctx.ui.custom<SessionData[] | null>((tui, theme, _kb, done) => {
				const baseMessage = "Analyzing sessions (last 90 days)…";
				const loader = new BorderedLoader(tui, theme, baseMessage);

				const startedAt = Date.now();
				const progress: UsageProgressState = {
					phase: "scan",
					foundFiles: 0,
					parsedFiles: 0,
					totalFiles: 0,
					currentFile: undefined,
				};

				const renderMessage = (): string => {
					const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
					if (progress.phase === "scan") {
						return `${baseMessage}  scanning (${formatCount(progress.foundFiles)} files) · ${elapsed}s`;
					}
					if (progress.phase === "parse") {
						return `${baseMessage}  parsing (${formatCount(progress.parsedFiles)}/${formatCount(progress.totalFiles)}) · ${elapsed}s`;
					}
					return `${baseMessage}  finalizing · ${elapsed}s`;
				};

				setBorderedLoaderMessage(loader, renderMessage());
				const ticker = setInterval(() => setBorderedLoaderMessage(loader, renderMessage()), 500);
				const stopTicker = () => clearInterval(ticker);

				loader.onAbort = () => {
					aborted = true;
					stopTicker();
					done(null);
				};

				collectSessions(loader.signal, (update) => Object.assign(progress, update))
					.then((data) => {
						stopTicker();
						if (!aborted) done(data);
					})
					.catch(() => {
						stopTicker();
						if (!aborted) done(null);
					});

				return loader;
			});

			if (!sessions) {
				ctx.ui.notify(aborted ? "Cancelled" : "Failed to analyze sessions", aborted ? "info" : "error");
				return;
			}

			await ctx.ui.custom((tui, theme, _kb, done) => {
				return new UsageComponent(tui, theme, sessions, () => done(undefined));
			});
		},
	});
}
