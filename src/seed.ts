/** Mulberry32 — small deterministic PRNG from a 32-bit seed. */
export function createRng(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Hash a number into a stable uint32 (used when seed is omitted → legacy look). */
export function hashSeed(value: number): number {
	let h = value >>> 0;
	h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
	h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
	return (h ^ (h >>> 16)) >>> 0;
}
