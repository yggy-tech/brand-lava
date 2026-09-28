import type { BrandLavaFieldProps } from "./types";

export type LavaStyle = {
	fill: boolean;
	outline: boolean;
	/** CSS pixels. */
	outlineWidth: number;
	outlineColor: string;
	transparent: boolean;
};

export function normalizeLavaStyle({
	fill,
	outline,
	background,
	colors,
}: Pick<BrandLavaFieldProps, "fill" | "outline" | "background" | "colors">): LavaStyle {
	const filled = fill !== false;
	return {
		fill: filled,
		outline: outline?.enabled ?? !filled,
		outlineWidth: Math.max(0.5, Math.min(24, outline?.width ?? 2)),
		outlineColor: outline?.color ?? colors?.highlight ?? "var(--brand-lava-highlight)",
		transparent: background === "transparent",
	};
}

/** Scene units covered by one CSS pixel at the blob plane (z = 0). */
export function worldUnitsPerCssPixel(
	cssHeight: number,
	camera: { projection: number; distance: number; scale: number; focalLength: number },
): number {
	const viewHeight = camera.projection === 1 ? (camera.scale * camera.distance) / camera.focalLength : camera.scale;
	return viewHeight / Math.max(1, cssHeight);
}
