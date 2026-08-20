/** Default render cap for brand surfaces. Pass `maxFps={0}` to uncap. */
export const DEFAULT_MAX_FPS = 45;

export function getRenderSize(
	width: number,
	height: number,
	devicePixelRatio: number,
	resolutionScale: number,
): readonly [number, number] {
	const pixelRatio = Math.max(1, Math.min(devicePixelRatio, 2)) * Math.max(0.25, Math.min(resolutionScale, 1));
	return [Math.max(1, Math.floor(width * pixelRatio)), Math.max(1, Math.floor(height * pixelRatio))];
}

export function getBlurRadius(resolutionScale: number, blur?: number): number {
	return Math.max(0, Math.min(blur ?? (1 - Math.max(0.25, Math.min(resolutionScale, 1))) * 2, 8));
}

/**
 * Minimum ms between drawn frames for a given FPS cap.
 * `undefined` / invalid / ≤0 → 0 (uncapped, draw every animation frame).
 */
export function getMinFrameInterval(maxFps?: number): number {
	if (maxFps === undefined || !Number.isFinite(maxFps) || maxFps <= 0) {
		return 0;
	}
	return 1000 / maxFps;
}
