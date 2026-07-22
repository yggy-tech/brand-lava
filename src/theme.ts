import type { Rgb, ThemeColors } from "./types";

export function cssColorToRgb(value: string, fallback: Rgb): Rgb {
	const color = value.trim();
	const cssVariable = color.match(/^var\(\s*(--[\w-]+)/);
	if (cssVariable && typeof document !== "undefined") {
		const resolved = getComputedStyle(document.documentElement).getPropertyValue(cssVariable[1]);
		if (resolved.trim()) {
			return cssColorToRgb(resolved, fallback);
		}
	}

	const hex = color.match(/^#([0-9a-f]{6})$/i);
	if (hex) {
		const raw = Number.parseInt(hex[1], 16);
		return [((raw >> 16) & 255) / 255, ((raw >> 8) & 255) / 255, (raw & 255) / 255];
	}

	const rgb = color.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/i) ?? color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/i);
	if (rgb) {
		return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
	}

	return fallback;
}

export function readThemeColors(): ThemeColors {
	const styles = getComputedStyle(document.documentElement);

	return {
		background: cssColorToRgb(styles.getPropertyValue("--background"), [0.94, 0.92, 0.9]),
		card: cssColorToRgb(styles.getPropertyValue("--card"), [0.98, 0.98, 0.91]),
		lavaA: cssColorToRgb(
			styles.getPropertyValue("--brand-lava-1") || styles.getPropertyValue("--auth-lava-1"),
			[0.58, 0.68, 0.34],
		),
		lavaB: cssColorToRgb(
			styles.getPropertyValue("--brand-lava-2") || styles.getPropertyValue("--auth-lava-2"),
			[0.39, 0.48, 0.24],
		),
		lavaC: cssColorToRgb(
			styles.getPropertyValue("--brand-lava-3") || styles.getPropertyValue("--auth-lava-3"),
			[0.27, 0.35, 0.16],
		),
	};
}
