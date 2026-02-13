import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { formatCount } from "./formatting";
import type { ProviderRow } from "./provider-breakdown";

export function renderProviderTable(rows: ProviderRow[], theme: Theme, width: number): string[] {
	const lines: string[] = [];
	if (rows.length === 0) return lines;

	const t = theme;
	const providerW = Math.max(8, ...rows.map((r) => r.provider.length)) + 4;
	const sessW = 10;
	const msgW = 10;
	const tokW = 10;
	const costW = 12;
	const shareW = 8;

	lines.push(
		truncateToWidth(
			t.fg(
				"dim",
				"  provider".padEnd(providerW) +
					"sessions".padStart(sessW) +
					"messages".padStart(msgW) +
					"tokens".padStart(tokW) +
					"cost".padStart(costW) +
					"share".padStart(shareW),
			),
			width,
		),
	);

	const totalW = providerW + sessW + msgW + tokW + costW + shareW;
	lines.push(truncateToWidth(t.fg("dim", "─".repeat(totalW)), width));

	for (const row of rows) {
		const cell = "  " + row.provider.padEnd(providerW - 2);
		lines.push(
			truncateToWidth(
				cell +
					String(row.sessions).padStart(sessW) +
					formatCount(row.messages).padStart(msgW) +
					formatCount(row.tokens).padStart(tokW) +
					`$${row.cost.toFixed(2)}`.padStart(costW) +
					`${row.share}%`.padStart(shareW),
				width,
			),
		);
	}

	return lines;
}
