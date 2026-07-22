import { useEffect, useRef } from "react";

type Rgb = readonly [number, number, number];
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
	blobCount?: number;
	blobSize?: number;
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

type ThemeColors = {
	background: Rgb;
	card: Rgb;
	lavaA: Rgb;
	lavaB: Rgb;
	lavaC: Rgb;
};

type BlobState = {
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

function cssColorToRgb(value: string, fallback: Rgb): Rgb {
	const color = value.trim();
	const cssVariable = color.match(/^var\(\s*(--[\w-]+)/);
	if (cssVariable && typeof document !== "undefined") {
		const resolved = getComputedStyle(document.documentElement).getPropertyValue(cssVariable[1]);
		if (resolved.trim()) {
			return cssColorToRgb(resolved, fallback);
		}
	}

	const hex = color.match(/^#([0-9a-f]{6})$/i);
	if (hex) {
		const raw = Number.parseInt(hex[1], 16);
		return [((raw >> 16) & 255) / 255, ((raw >> 8) & 255) / 255, (raw & 255) / 255];
	}

	const rgb = color.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/i) ?? color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/i);
	if (rgb) {
		return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
	}

	return fallback;
}

function readThemeColors(): ThemeColors {
	const styles = getComputedStyle(document.documentElement);

	return {
		background: cssColorToRgb(styles.getPropertyValue("--background"), [0.94, 0.92, 0.9]),
		card: cssColorToRgb(styles.getPropertyValue("--card"), [0.98, 0.98, 0.91]),
		lavaA: cssColorToRgb(
			styles.getPropertyValue("--brand-lava-1") || styles.getPropertyValue("--auth-lava-1"),
			[0.58, 0.68, 0.34],
		),
		lavaB: cssColorToRgb(
			styles.getPropertyValue("--brand-lava-2") || styles.getPropertyValue("--auth-lava-2"),
			[0.39, 0.48, 0.24],
		),
		lavaC: cssColorToRgb(
			styles.getPropertyValue("--brand-lava-3") || styles.getPropertyValue("--auth-lava-3"),
			[0.27, 0.35, 0.16],
		),
	};
}

function createShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error("Failed to create shader");
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const error = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile failed: ${error}`);
	}

	return shader;
}

function activateProgram(gl: WebGLRenderingContext, program: WebGLProgram) {
	const useWebGlProgram = Reflect.get(gl, "useProgram") as WebGLRenderingContext["useProgram"];
	useWebGlProgram.call(gl, program);
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
	const vertexShader = createShader(gl, vertexSource, gl.VERTEX_SHADER);
	const fragmentShader = createShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
	const program = gl.createProgram();

	if (!program) {
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		throw new Error("Failed to create program");
	}

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const error = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error(`Shader link failed: ${error}`);
	}

	return program;
}

const vertexSource = `
	attribute vec2 aPosition;

	void main() {
		gl_Position = vec4(aPosition, 0.0, 1.0);
	}
`;

const fragmentSource = `
	precision highp float;

	uniform vec2 uResolution;
	uniform float uTime;
	uniform vec2 uMouse;
	uniform vec3 uBackground;
	uniform vec3 uCard;
	uniform vec3 uLavaA;
	uniform vec3 uLavaB;
	uniform vec3 uLavaC;
	uniform vec4 uHighlights[4];
	uniform vec3 uHighlightColors[4];
	uniform vec4 uCursorLight;
	uniform vec3 uCursorLightColor;
	uniform vec4 uLavaShape;
	uniform vec4 uLavaMotion;
	uniform vec4 uBlobSpheres[12];

	float smin(float a, float b, float k) {
		float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
		return mix(b, a, h) - k * h * (1.0 - h);
	}

	vec3 rotateX(vec3 p, float a) {
		float s = sin(a);
		float c = cos(a);
		return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
	}

	vec3 rotateY(vec3 p, float a) {
		float s = sin(a);
		float c = cos(a);
		return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
	}

	float sdSphere(vec3 p, vec3 c, float r) {
		return length(p - c) - r;
	}

	float mapField(vec3 p, float t) {
		float d = 8.0;

		for (int i = 0; i < 12; i++) {
			vec4 sphere = uBlobSpheres[i];
			d = smin(d, sdSphere(p, sphere.xyz, sphere.w), uLavaShape.w);
		}

		return d;
	}

	vec3 normalAt(vec3 p, float t) {
		vec2 e = vec2(0.004, 0.0);
		return normalize(vec3(
			mapField(p + e.xyy, t) - mapField(p - e.xyy, t),
			mapField(p + e.yxy, t) - mapField(p - e.yxy, t),
			mapField(p + e.yyx, t) - mapField(p - e.yyx, t)
		));
	}

	void main() {
		vec2 uv = (gl_FragCoord.xy / uResolution.xy - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

		vec3 ro = vec3(0.0, 0.0, 4.45);
		vec3 rd = normalize(vec3(uv * 1.42, -2.05));

		float travel = 0.0;
		float hit = 0.0;
		float maxDist = 7.0;

		for (int i = 0; i < 80; i++) {
			vec3 pos = ro + rd * travel;
			float d = mapField(pos, uTime * uLavaMotion.x);

			if (d < 0.0025) {
				hit = 1.0;
				break;
			}

			travel += max(0.006, d * 0.72);
			if (travel > maxDist) {
				break;
			}
		}

		float paper = smoothstep(-0.9, 0.9, uv.y);
		float warm = smoothstep(1.1, 0.0, length(uv - vec2(-0.05, -0.1)));
		vec3 color = mix(uBackground, uCard, 0.42 + paper * 0.2);
		color = mix(color, uLavaB, warm * 0.16);
		vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
		float cursorLight = smoothstep(uCursorLight.z, 0.0, length(screenUv - uMouse)) * uCursorLight.w;

		if (hit > 0.5) {
			vec3 p = ro + rd * travel;
			vec3 n = normalAt(p, uTime * uLavaMotion.x);
			float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
			float light = clamp(dot(n, normalize(vec3(-0.35, 0.7, 0.5))), 0.0, 1.0);
			float glow = 1.0 - clamp(travel / maxDist, 0.0, 1.0);
			float wave = sin(p.y * 3.2 + p.x * 1.25 + uTime * 0.75) * 0.5 + 0.5;

			vec3 lava = mix(uLavaC, uLavaB, smoothstep(0.0, 1.0, wave * 0.22 + light * 0.56));
			lava = mix(lava, uLavaA, fresnel * 0.12 + glow * 0.06);
			lava += uCard * fresnel * 0.08;
			lava = mix(lava, uCursorLightColor, cursorLight * 0.18);
			color = lava;
		}

		for (int i = 0; i < 4; i++) {
			vec4 highlight = uHighlights[i];
			float area = smoothstep(highlight.z, 0.0, length(screenUv - highlight.xy)) * highlight.w;
			color = mix(color, uHighlightColors[i], area);
			color += uHighlightColors[i] * area * 0.16;
		}

		float vignette = smoothstep(1.35, 0.12, length(uv) * 1.05);
		float dither = fract((gl_FragCoord.x + gl_FragCoord.y * 1.61803398875) * 0.5) - 0.5;
		color += dither / 510.0;
		gl_FragColor = vec4(color * mix(0.86, 1.04, vignette), 1.0);
	}
`;

function clampUnit(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function normalizeHighlights(
	highlights: readonly BrandLavaHighlight[] | undefined,
): readonly Required<BrandLavaHighlight>[] {
	return (highlights ?? []).slice(0, 4).map((highlight) => ({
		x: clampUnit(highlight.x),
		y: clampUnit(highlight.y),
		radius: Math.max(0.01, Math.min(1, highlight.radius ?? 0.22)),
		intensity: clampUnit(highlight.intensity ?? 0.38),
		color: highlight.color ?? "var(--brand-lava-highlight, var(--brand-lava-1, #94ad57))",
	}));
}

function normalizeDistribution(distribution: BrandLavaDistribution | undefined): number {
	if (distribution === "column") {
		return 0;
	}
	if (distribution === "spread") {
		return 1;
	}
	return 0.52;
}

function normalizeLavaControls(props: BrandLavaFieldProps) {
	return {
		blobCount: Math.max(1, Math.min(12, Math.round(props.blobCount ?? 12))),
		blobSize: Math.max(0.45, Math.min(1.8, props.blobSize ?? 1)),
		distribution: normalizeDistribution(props.distribution),
		speed: Math.max(0, Math.min(3, props.speed ?? 0.72)),
		gravity: Math.max(-1, Math.min(1, props.gravity ?? 0)),
		attraction: Math.max(0, Math.min(0.7, props.attraction ?? 0.08)),
		mergeSmoothness: Math.max(0.05, Math.min(0.6, props.mergeSmoothness ?? 0.25)),
		clickPulseStrength: Math.max(0, Math.min(2, props.clickPulse?.strength ?? 0.9)),
		clickPulseDecay: Math.max(0.72, Math.min(0.98, props.clickPulse?.decay ?? 0.93)),
	};
}

function createBlobStates(): BlobState[] {
	return Array.from({ length: 12 }, (_, index) => ({
		x: 0,
		y: index === 0 ? -1.35 : index === 11 ? 1.48 : -1.05 + (index - 1) * 0.29,
		z: 0,
		vx: 0,
		vy: 0,
		targetX: 0,
		targetY: index === 0 ? -1.35 : index === 11 ? 1.48 : -1.05 + (index - 1) * 0.29,
		offsetX: 0,
		offsetY: 0,
		phase: index * 1.61803,
		radiusSeed: Math.sin(index * 127.1) * 0.5 + 0.5,
	}));
}

function updateBlobStates(
	blobs: BlobState[],
	controls: ReturnType<typeof normalizeLavaControls>,
	time: number,
	mouse: { x: number; y: number },
) {
	const pointerX = (mouse.x - 0.5) * 1.1;
	const pointerY = (mouse.y - 0.5) * 2;
	const distribution = controls.distribution;
	const activeCount = controls.blobCount;
	const spacing = 0.24 + distribution * 0.09;
	const damping = Math.min(0.985, controls.clickPulseDecay + 0.035 - Math.min(0.04, controls.speed * 0.012));
	const spring = 0.0018 + controls.speed * 0.0022;

	for (const [index, blob] of blobs.entries()) {
		if (index >= activeCount) {
			blob.x = 0;
			blob.y = 0;
			blob.vx = 0;
			blob.vy = 0;
			continue;
		}

		const phase = blob.phase + time * 0.18 * controls.speed;
		const drift = (0.28 + blob.radiusSeed * 0.24) * (0.72 + distribution * 0.62);
		const baseY =
			index === 0
				? -1.35 - controls.gravity * 0.08
				: index === 11
					? 1.48
					: -1.05 + (index - 1) * spacing - controls.gravity * (0.1 + blob.radiusSeed * 0.24);
		blob.targetX = Math.cos(phase + 0.7 * Math.sin(time * 0.38 * controls.speed + index * 1.1)) * drift + blob.offsetX;
		blob.targetY =
			baseY + Math.sin(phase * 0.9 + time * 0.42 * controls.speed) * (0.08 + distribution * 0.08) + blob.offsetY;
		blob.z = Math.cos(phase * 0.67 + time * 0.5 * controls.speed) * (0.18 + distribution * 0.16);

		const towardPointerX = pointerX - blob.x;
		const towardPointerY = pointerY - blob.y;
		const pointerDistance = Math.hypot(towardPointerX, towardPointerY);
		const pointerPull = Math.max(0, 1 - pointerDistance / 1.65) * controls.attraction * 0.006;

		blob.vx += (blob.targetX - blob.x) * spring + towardPointerX * pointerPull;
		blob.vy += (blob.targetY - blob.y) * spring + towardPointerY * pointerPull - controls.gravity * 0.00045;
		blob.vx *= damping;
		blob.vy *= damping;
		blob.x += blob.vx;
		blob.y += blob.vy;
	}
}

function pushBlobPulse(
	blobs: BlobState[],
	controls: ReturnType<typeof normalizeLavaControls>,
	mouse: { x: number; y: number },
) {
	const originX = (mouse.x - 0.5) * 1.1;
	const originY = (mouse.y - 0.5) * 2;

	for (const [index, blob] of blobs.entries()) {
		if (index >= controls.blobCount) {
			continue;
		}

		const dx = blob.x - originX;
		const dy = blob.y - originY;
		const distance = Math.max(0.001, Math.hypot(dx, dy));
		const falloff = Math.max(0, 1 - distance / 1.35);
		const impulse = controls.clickPulseStrength * falloff * falloff * 0.032;
		const impulseX = (dx / distance) * impulse;
		const impulseY = (dy / distance) * impulse;
		blob.vx += impulseX;
		blob.vy += impulseY;
		blob.offsetX += impulseX * 4.4;
		blob.offsetY += impulseY * 4.4;
	}
}

export function BrandLavaField({
	highlights,
	cursorLight,
	blobCount,
	blobSize,
	distribution,
	speed,
	gravity,
	attraction,
	mergeSmoothness,
	clickPulse,
}: BrandLavaFieldProps) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const highlightsRef = useRef(normalizeHighlights(highlights));
	const lavaControlsRef = useRef(
		normalizeLavaControls({
			blobCount,
			blobSize,
			distribution,
			speed,
			gravity,
			attraction,
			mergeSmoothness,
			clickPulse,
		}),
	);
	const cursorLightRef = useRef({
		radius: Math.max(0.01, Math.min(1, cursorLight?.radius ?? 0.34)),
		intensity: clampUnit(cursorLight?.intensity ?? 0.7),
		color: cursorLight?.color ?? "var(--brand-lava-cursor-light, var(--brand-lava-1, #94ad57))",
	});

	highlightsRef.current = normalizeHighlights(highlights);
	lavaControlsRef.current = normalizeLavaControls({
		blobCount,
		blobSize,
		distribution,
		speed,
		gravity,
		attraction,
		mergeSmoothness,
		clickPulse,
	});
	cursorLightRef.current = {
		radius: Math.max(0.01, Math.min(1, cursorLight?.radius ?? 0.34)),
		intensity: clampUnit(cursorLight?.intensity ?? 0.7),
		color: cursorLight?.color ?? "var(--brand-lava-cursor-light, var(--brand-lava-1, #94ad57))",
	};

	useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) {
			return;
		}

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reducedMotion) {
			return;
		}

		const gl = canvas.getContext("webgl");
		if (!gl) {
			return;
		}

		let animationFrame = 0;
		let program: WebGLProgram | null = null;
		let positionBuffer: WebGLBuffer | null = null;
		let positionLocation = -1;
		let resolutionLocation: WebGLUniformLocation | null = null;
		let timeLocation: WebGLUniformLocation | null = null;
		let mouseLocation: WebGLUniformLocation | null = null;
		let backgroundLocation: WebGLUniformLocation | null = null;
		let cardLocation: WebGLUniformLocation | null = null;
		let lavaALocation: WebGLUniformLocation | null = null;
		let lavaBLocation: WebGLUniformLocation | null = null;
		let lavaCLocation: WebGLUniformLocation | null = null;
		let highlightLocations: (WebGLUniformLocation | null)[] = [];
		let highlightColorLocations: (WebGLUniformLocation | null)[] = [];
		let cursorLightLocation: WebGLUniformLocation | null = null;
		let cursorLightColorLocation: WebGLUniformLocation | null = null;
		let lavaShapeLocation: WebGLUniformLocation | null = null;
		let lavaMotionLocation: WebGLUniformLocation | null = null;
		let blobSphereLocations: (WebGLUniformLocation | null)[] = [];

		try {
			program = createProgram(gl, vertexSource, fragmentSource);
			positionBuffer = gl.createBuffer();
			if (!positionBuffer) {
				throw new Error("Unable to allocate position buffer");
			}

			positionLocation = gl.getAttribLocation(program, "aPosition");
			resolutionLocation = gl.getUniformLocation(program, "uResolution");
			timeLocation = gl.getUniformLocation(program, "uTime");
			mouseLocation = gl.getUniformLocation(program, "uMouse");
			backgroundLocation = gl.getUniformLocation(program, "uBackground");
			cardLocation = gl.getUniformLocation(program, "uCard");
			lavaALocation = gl.getUniformLocation(program, "uLavaA");
			lavaBLocation = gl.getUniformLocation(program, "uLavaB");
			lavaCLocation = gl.getUniformLocation(program, "uLavaC");
			highlightLocations = [0, 1, 2, 3].map((index) => gl.getUniformLocation(program, `uHighlights[${index}]`));
			highlightColorLocations = [0, 1, 2, 3].map((index) =>
				gl.getUniformLocation(program, `uHighlightColors[${index}]`),
			);
			cursorLightLocation = gl.getUniformLocation(program, "uCursorLight");
			cursorLightColorLocation = gl.getUniformLocation(program, "uCursorLightColor");
			lavaShapeLocation = gl.getUniformLocation(program, "uLavaShape");
			lavaMotionLocation = gl.getUniformLocation(program, "uLavaMotion");
			blobSphereLocations = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) =>
				gl.getUniformLocation(program, `uBlobSpheres[${index}]`),
			);

			if (
				resolutionLocation === null ||
				timeLocation === null ||
				mouseLocation === null ||
				backgroundLocation === null ||
				cardLocation === null ||
				lavaALocation === null ||
				lavaBLocation === null ||
				lavaCLocation === null ||
				cursorLightLocation === null ||
				cursorLightColorLocation === null ||
				lavaShapeLocation === null ||
				lavaMotionLocation === null ||
				blobSphereLocations.some((location) => location === null) ||
				highlightLocations.some((location) => location === null) ||
				highlightColorLocations.some((location) => location === null) ||
				positionLocation < 0
			) {
				throw new Error("Unable to initialize WebGL uniform attributes");
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

			activateProgram(gl, program);
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		} catch {
			if (program) {
				gl.deleteProgram(program);
			}
			if (positionBuffer) {
				gl.deleteBuffer(positionBuffer);
			}
			return;
		}

		const mouse = { x: 0.5, y: 0.5 };
		const targetMouse = { x: 0.5, y: 0.5 };
		const blobs = createBlobStates();
		const onMove = (event: PointerEvent) => {
			const rect = root.getBoundingClientRect();
			targetMouse.x = (event.clientX - rect.left) / rect.width;
			targetMouse.y = 1 - (event.clientY - rect.top) / rect.height;
		};
		const onDown = (event: PointerEvent) => {
			const rect = root.getBoundingClientRect();
			pushBlobPulse(blobs, lavaControlsRef.current, {
				x: (event.clientX - rect.left) / rect.width,
				y: 1 - (event.clientY - rect.top) / rect.height,
			});
		};
		const onLeave = () => {
			targetMouse.x = 0.5;
			targetMouse.y = 0.5;
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const dpr = Math.max(1, Math.min(window.devicePixelRatio, 2));
			canvas.width = Math.max(1, Math.floor(rect.width * dpr));
			canvas.height = Math.max(1, Math.floor(rect.height * dpr));
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		let themeColors = readThemeColors();
		const observer = new MutationObserver(() => {
			themeColors = readThemeColors();
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

		const render = (time: number) => {
			if (
				!program ||
				!resolutionLocation ||
				!timeLocation ||
				!mouseLocation ||
				!backgroundLocation ||
				!cardLocation ||
				!lavaALocation ||
				!lavaBLocation ||
				!lavaCLocation ||
				!cursorLightLocation ||
				!cursorLightColorLocation ||
				!lavaShapeLocation ||
				!lavaMotionLocation
			) {
				return;
			}

			activateProgram(gl, program);
			mouse.x += (targetMouse.x - mouse.x) * 0.026;
			mouse.y += (targetMouse.y - mouse.y) * 0.026;
			gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
			gl.uniform1f(timeLocation, time * 0.001);
			gl.uniform2f(mouseLocation, mouse.x, mouse.y);
			gl.uniform3f(backgroundLocation, themeColors.background[0], themeColors.background[1], themeColors.background[2]);
			gl.uniform3f(cardLocation, themeColors.card[0], themeColors.card[1], themeColors.card[2]);
			gl.uniform3f(lavaALocation, themeColors.lavaA[0], themeColors.lavaA[1], themeColors.lavaA[2]);
			gl.uniform3f(lavaBLocation, themeColors.lavaB[0], themeColors.lavaB[1], themeColors.lavaB[2]);
			gl.uniform3f(lavaCLocation, themeColors.lavaC[0], themeColors.lavaC[1], themeColors.lavaC[2]);
			const lavaControls = lavaControlsRef.current;
			updateBlobStates(blobs, lavaControls, time * 0.001, mouse);
			gl.uniform4f(
				lavaShapeLocation,
				lavaControls.blobCount,
				lavaControls.blobSize,
				lavaControls.distribution,
				lavaControls.mergeSmoothness,
			);
			gl.uniform4f(lavaMotionLocation, lavaControls.speed, 0, lavaControls.gravity, lavaControls.attraction);
			for (const [index, location] of blobSphereLocations.entries()) {
				if (!location) {
					continue;
				}
				const blob = blobs[index];
				const active = index < lavaControls.blobCount;
				const radius = active
					? ((index === 0 ? 0.34 : index === 11 ? 0.29 : 0.19 + 0.08 * blob.radiusSeed) +
							0.035 * Math.sin(time * 0.00036 * lavaControls.speed + index)) *
						lavaControls.blobSize
					: 0;
				gl.uniform4f(location, blob.x, blob.y, blob.z, radius);
			}
			gl.uniform4f(
				cursorLightLocation,
				mouse.x,
				mouse.y,
				cursorLightRef.current.radius,
				cursorLightRef.current.intensity,
			);
			const cursorColor = cssColorToRgb(cursorLightRef.current.color, themeColors.lavaA);
			gl.uniform3f(cursorLightColorLocation, cursorColor[0], cursorColor[1], cursorColor[2]);
			for (const [index, location] of highlightLocations.entries()) {
				const colorLocation = highlightColorLocations[index];
				if (!location || !colorLocation) {
					continue;
				}
				const highlight = highlightsRef.current[index];
				const x = highlight?.x ?? 0;
				const y = highlight?.y ?? 0;
				const radius = highlight?.radius ?? 0.01;
				const intensity = highlight?.intensity ?? 0;
				const color = cssColorToRgb(highlight?.color ?? "transparent", themeColors.lavaA);
				gl.uniform4f(location, x, y, radius, intensity);
				gl.uniform3f(colorLocation, color[0], color[1], color[2]);
			}
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			animationFrame = requestAnimationFrame(render);
		};

		root.addEventListener("pointermove", onMove);
		root.addEventListener("pointerdown", onDown);
		root.addEventListener("pointerleave", onLeave);
		window.addEventListener("resize", resize);
		resize();
		animationFrame = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(animationFrame);
			observer.disconnect();
			root.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerdown", onDown);
			root.removeEventListener("pointerleave", onLeave);
			window.removeEventListener("resize", resize);
			if (positionBuffer) {
				gl.deleteBuffer(positionBuffer);
			}
			if (program) {
				gl.deleteProgram(program);
			}
		};
	}, []);

	return (
		<div
			ref={rootRef}
			aria-hidden="true"
			className="absolute inset-0"
			style={{
				background:
					"radial-gradient(circle at 46% 34%, color-mix(in srgb, var(--brand-lava-2, var(--auth-lava-2)) 28%, transparent), transparent 48%), linear-gradient(145deg, var(--card), var(--background))",
			}}
		>
			<canvas ref={canvasRef} className="absolute inset-0 size-full" />
		</div>
	);
}

export const LavaLampField = BrandLavaField;
