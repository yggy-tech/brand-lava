export type BrandLavaHighlight = {
	x: number;
	y: number;
	radius?: number;
	intensity?: number;
	color?: string;
};

export type BrandLavaDistribution = "column" | "balanced" | "spread";

export type BrandLavaFieldProps = {
	highlights?: readonly BrandLavaHighlight[];
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
	connections?: {
		mode?: "none" | "elastic";
		count?: number;
		segments?: number;
		radius?: number;
		tension?: number;
		damping?: number;
		wobble?: number;
		blend?: number;
	};
	bounds?: {
		x?: readonly [number, number];
		y?: readonly [number, number];
		z?: readonly [number, number];
		bounce?: number;
	};
	depthOfField?: {
		enabled?: boolean;
		focus?: number;
		range?: number;
		strength?: number;
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

export type ElasticPoint = {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
};

export type ElasticConnection = {
	from: number;
	to: number;
	bend: number;
	points: ElasticPoint[];
};

export type SatelliteBlob = {
	from: number;
	to: number;
	phase: number;
	offset: number;
};
