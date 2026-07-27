export function getRenderSize(
	width: number,
	height: number,
	devicePixelRatio: number,
	resolutionScale: number,
): readonly [number, number] {
	const pixelRatio = Math.max(1, Math.min(devicePixelRatio, 2)) * Math.max(0.25, Math.min(resolutionScale, 1));
	return [Math.max(1, Math.floor(width * pixelRatio)), Math.max(1, Math.floor(height * pixelRatio))];
}
