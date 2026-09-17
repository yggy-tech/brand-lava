import { describe, expect, test } from "vitest";
import { createRng, hashSeed } from "./seed";

describe("createRng", () => {
	test("is deterministic for the same seed", () => {
		const a = createRng(42);
		const b = createRng(42);
		expect([a(), a(), a()]).toEqual([b(), b(), b()]);
	});

	test("diverges for different seeds", () => {
		const a = createRng(1);
		const b = createRng(2);
		expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
	});

	test("returns values in [0, 1)", () => {
		const rng = createRng(99);
		for (let i = 0; i < 100; i += 1) {
			const value = rng();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe("hashSeed", () => {
	test("is stable", () => {
		expect(hashSeed(12345)).toBe(hashSeed(12345));
	});

	test("maps nearby inputs to different hashes", () => {
		expect(hashSeed(1)).not.toBe(hashSeed(2));
	});
});
