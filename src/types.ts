export type BrandLavaDistribution = "column" | "balanced" | "spread";

export type BrandLavaStaticNode = {
	x: number;
	y: number;
	z?: number;
	radius: number;
};

export type BrandLavaColors = {
	lava1?: string;
	lava2?: string;
	lava3?: string;
	highlight?: string;
	cursorLight?: string;
};

export type BrandLavaFieldProps = {
	resolutionScale?: number;
	blur?: number;
	/**
	 * Cap drawn frames per second. Defaults to 45.
	 * Pass `0` (or a non-positive value) to run uncapped at the display refresh rate.
	 */
	maxFps?: number;
	/**
	 * Deterministic layout seed for blob phases, sizes, and satellite wiring.
	 * Omit for the classic fixed layout; pass a new value each mount for variety.
	 */
	seed?: number;
	/** Blob and cursor colors. Omit a key to keep the CSS / package default. */
	colors?: BrandLavaColors;
	cursorLight?: {
		radius?: number;
		intensity?: number;
		color?: string;
	};
	fieldInteraction?: {
		enabled?: boolean;
		attraction?: number;
		repulsion?: number;
		range?: number;
	};
	satellites?: {
		enabled?: boolean;
		count?: number;
		size?: number;
		drift?: number;
	};
	bounds?: {
		x?: readonly [number, number];
		y?: readonly [number, number];
		z?: readonly [number, number];
		bounce?: number;
	};
	staticNodes?: readonly BrandLavaStaticNode[];
	camera?: {
		projection?: "orthographic" | "perspective";
		distance?: number;
		scale?: number;
		focalLength?: number;
	};
	blobCount?: number;
	blobSize?: number;
	blobSizeRange?: readonly [number, number];
	distribution?: BrandLavaDistribution;
	speed?: number;
	gravity?: number;
	attraction?: number;
	mergeSmoothness?: number;
	clickPulse?: {
		strength?: number;
		decay?: number;
	};
	/** Paint blob interiors. Defaults to `true`. With `false`, the outline turns on unless disabled. */
	fill?: boolean;
	/** Border around the merged blob silhouette. */
	outline?: {
		/** Defaults to `true` when `fill` is `false`, else `false`. */
		enabled?: boolean;
		/** CSS pixels, `0.5` to `24`. Defaults to `2`. */
		width?: number;
		/** Defaults to `colors.highlight`, then `--brand-lava-highlight`. */
		color?: string;
	};
	/** `"transparent"` draws only the blobs so the page shows through. Defaults to `"theme"`. */
	background?: BrandLavaBackground;
	/** Strength of the tint the second lava colour casts on the centre of the background, 0 to 1. Defaults to `1`; `0` keeps the background flat. */
	glow?: number;
	/** Strength of the edge darkening over the whole field, blobs included, 0 to 1. Defaults to `1`; `0` turns it off. */
	vignette?: number;
};

export type BrandLavaBackground = "theme" | "transparent";

export type Rgb = readonly [number, number, number];

export type ThemeColors = {
	background: Rgb;
	card: Rgb;
	lavaA: Rgb;
	lavaB: Rgb;
	lavaC: Rgb;
};

export type BlobState = {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	targetX: number;
	targetY: number;
	offsetX: number;
	offsetY: number;
	phase: number;
	radiusSeed: number;
};

export type SatelliteBlob = {
	from: number;
	to: number;
	phase: number;
	offset: number;
};
