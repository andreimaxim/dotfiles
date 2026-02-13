import type { Period } from "./types";

export function fmtDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localMidnight(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function addDaysLocal(d: Date, days: number): Date {
	const next = new Date(d);
	next.setDate(next.getDate() + days);
	return next;
}

export function periodDays(period: Period): number {
	return period === "7d" ? 7 : period === "30d" ? 30 : 90;
}

export function cutoffDateKey(days: number): string {
	const start = addDaysLocal(localMidnight(new Date()), -(days - 1));
	return fmtDate(start);
}
