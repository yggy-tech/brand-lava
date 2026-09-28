import { expect, test } from "vitest";
import { normalizeLavaStyle, worldUnitsPerCssPixel } from "./style";

test("defaults to filled blobs on the theme background without an outline", () => {
	expect(normalizeLavaStyle({})).toEqual({
		fill: true,
		outline: false,
		outlineWidth: 2,
		outlineColor: "var(--brand-lava-highlight)",
		transparent: false,
	});
});

test("turns the outline on when fill is off so blobs stay visible", () => {
	expect(normalizeLavaStyle({ fill: false })).toMatchObject({ fill: false, outline: true });
});

test("keeps an explicitly disabled outline off", () => {
	expect(normalizeLavaStyle({ fill: false, outline: { enabled: false } }).outline).toBe(false);
});

test("clamps the outline width to a visible range in CSS pixels", () => {
	expect(normalizeLavaStyle({ outline: { width: 0 } }).outlineWidth).toBe(0.5);
	expect(normalizeLavaStyle({ outline: { width: 99 } }).outlineWidth).toBe(24);
});

test("uses the outline color, then the highlight color, then the CSS highlight", () => {
	expect(normalizeLavaStyle({ outline: { color: "#ff0000" }, colors: { highlight: "#00ff00" } }).outlineColor).toBe(
		"#ff0000",
	);
	expect(normalizeLavaStyle({ colors: { highlight: "#00ff00" } }).outlineColor).toBe("#00ff00");
});

test("renders a transparent background on request", () => {
	expect(normalizeLavaStyle({ background: "transparent" }).transparent).toBe(true);
});

test("converts CSS pixels to scene units for orthographic and perspective cameras", () => {
	const camera = { projection: 0, distance: 4, scale: 1.5, focalLength: 2 };
	expect(worldUnitsPerCssPixel(300, camera)).toBeCloseTo(1.5 / 300);
	expect(worldUnitsPerCssPixel(300, { ...camera, projection: 1 })).toBeCloseTo((1.5 * 4) / 2 / 300);
	expect(worldUnitsPerCssPixel(0, camera)).toBeCloseTo(1.5);
});
