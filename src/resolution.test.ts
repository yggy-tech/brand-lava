import { describe, expect, test } from "vitest";
import { getRenderSize } from "./resolution";

describe("getRenderSize", () => {
	test("scales the capped device resolution and clamps unsafe values", () => {
		expect(getRenderSize(1440, 828, 2, 0.5)).toEqual([1440, 828]);
		expect(getRenderSize(1440, 828, 3, 2)).toEqual([2880, 1656]);
		expect(getRenderSize(1, 1, 1, 0)).toEqual([1, 1]);
	});
});
