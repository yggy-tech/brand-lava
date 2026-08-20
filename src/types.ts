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
};

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
