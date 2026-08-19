import { afterEach, expect, test, vi } from "vitest";
import { cssColorToRgb, readThemeColors } from "./theme";

afterEach(() => {
	vi.unstubAllGlobals();
});

test("parses six-digit hex into unit RGB", () => {
	expect(cssColorToRgb("#316251", [0, 0, 0])).toEqual([49 / 255, 98 / 255, 81 / 255]);
	expect(cssColorToRgb("#454c79", [0, 0, 0])).toEqual([69 / 255, 76 / 255, 121 / 255]);
	expect(cssColorToRgb("#743179", [0, 0, 0])).toEqual([116 / 255, 49 / 255, 121 / 255]);
});

test("falls back to the teal / indigo / purple scheme when CSS vars are empty", () => {
	vi.stubGlobal("document", { documentElement: {} });
	vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "" }));

	expect(readThemeColors()).toEqual({
		background: [0.94, 0.92, 0.9],
		card: [0.98, 0.98, 0.91],
		lavaA: [49 / 255, 98 / 255, 81 / 255],
		lavaB: [69 / 255, 76 / 255, 121 / 255],
		lavaC: [116 / 255, 49 / 255, 121 / 255],
	});
});

test("prefers color props over CSS variables", () => {
	vi.stubGlobal("document", { documentElement: {} });
	vi.stubGlobal("getComputedStyle", () => ({
		getPropertyValue: (name: string) => (name === "--brand-lava-1" ? "#ff0000" : ""),
	}));

	expect(
		readThemeColors({
			lava1: "#316251",
			lava2: "#454c79",
			lava3: "#743179",
		}),
	).toMatchObject({
		lavaA: [49 / 255, 98 / 255, 81 / 255],
		lavaB: [69 / 255, 76 / 255, 121 / 255],
		lavaC: [116 / 255, 49 / 255, 121 / 255],
	});
});
