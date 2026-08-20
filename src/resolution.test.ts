import { describe, expect, test } from "vitest";
import { DEFAULT_MAX_FPS, getBlurRadius, getMinFrameInterval, getRenderSize } from "./resolution";

describe("getRenderSize", () => {
	test("scales the capped device resolution and clamps unsafe values", () => {
		expect(getRenderSize(1440, 828, 2, 0.5)).toEqual([1440, 828]);
		expect(getRenderSize(1440, 828, 3, 2)).toEqual([2880, 1656]);
		expect(getRenderSize(1, 1, 1, 0)).toEqual([1, 1]);
	});

	test("adds a small blur below native resolution and accepts an override", () => {
		expect(getBlurRadius(0.5)).toBe(1);
		expect(getBlurRadius(1)).toBe(0);
		expect(getBlurRadius(0.5, 3)).toBe(3);
	});
});

describe("getMinFrameInterval", () => {
	test("defaults package FPS constant is a positive frame budget", () => {
		expect(DEFAULT_MAX_FPS).toBe(45);
		expect(getMinFrameInterval(DEFAULT_MAX_FPS)).toBeCloseTo(1000 / 45);
	});

	test("returns zero for uncapped values", () => {
		expect(getMinFrameInterval(undefined)).toBe(0);
		expect(getMinFrameInterval(0)).toBe(0);
		expect(getMinFrameInterval(-1)).toBe(0);
		expect(getMinFrameInterval(Number.NaN)).toBe(0);
	});

	test("converts positive fps to a millisecond interval", () => {
		expect(getMinFrameInterval(30)).toBeCloseTo(1000 / 30);
		expect(getMinFrameInterval(60)).toBeCloseTo(1000 / 60);
	});
});
