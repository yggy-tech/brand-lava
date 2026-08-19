import type { BrandLavaColors, Rgb, ThemeColors } from "./types";

/** Matches styles.css light defaults: primary / secondary / tertiary. */
const FALLBACK_LAVA_A: Rgb = [49 / 255, 98 / 255, 81 / 255];
const FALLBACK_LAVA_B: Rgb = [69 / 255, 76 / 255, 121 / 255];
const FALLBACK_LAVA_C: Rgb = [116 / 255, 49 / 255, 121 / 255];

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

export function readThemeColors(colors?: BrandLavaColors): ThemeColors {
	const styles = typeof document === "undefined" ? undefined : getComputedStyle(document.documentElement);
	const css = (name: string, legacy: string) => styles?.getPropertyValue(name) || styles?.getPropertyValue(legacy) || "";

	return {
		background: cssColorToRgb(css("--background", ""), [0.94, 0.92, 0.9]),
		card: cssColorToRgb(css("--card", ""), [0.98, 0.98, 0.91]),
		lavaA: cssColorToRgb(colors?.lava1 ?? css("--brand-lava-1", "--auth-lava-1"), FALLBACK_LAVA_A),
		lavaB: cssColorToRgb(colors?.lava2 ?? css("--brand-lava-2", "--auth-lava-2"), FALLBACK_LAVA_B),
		lavaC: cssColorToRgb(colors?.lava3 ?? css("--brand-lava-3", "--auth-lava-3"), FALLBACK_LAVA_C),
	};
}
