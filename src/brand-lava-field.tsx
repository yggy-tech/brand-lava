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
};

type ThemeColors = {
	background: Rgb;
	card: Rgb;
	lavaA: Rgb;
	lavaB: Rgb;
	lavaC: Rgb;
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

	float smin(float a, float b, float k) {
		float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
		return mix(b, a, h) - k * h * (1.0 - h);
	}

	float hash(float n) {
		return fract(sin(n * 127.1) * 43758.5453123);
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

	vec3 blobCenter(float index, float t) {
		float phase = index * 1.61803 + t * 0.18;
		float distribution = uLavaShape.z;
		float drift = (0.28 + hash(index) * 0.24) * mix(0.72, 1.34, distribution);
		float level = -1.05 + index * mix(0.24, 0.33, distribution);
		level -= uLavaMotion.z * (0.1 + hash(index + 4.0) * 0.24);
		return vec3(
			cos(phase + 0.7 * sin(t * 0.38 + index * 1.1)) * drift,
			level + sin(phase * 0.9 + t * 0.42) * mix(0.08, 0.16, distribution),
			cos(phase * 0.67 + t * 0.5) * mix(0.18, 0.34, distribution)
		);
	}

	float mapField(vec3 p, float t) {
		float d = 8.0;

		for (int i = 0; i < 12; i++) {
			float fi = float(i);
			float active = 1.0 - step(uLavaShape.x, fi);
			vec3 c = blobCenter(fi, t);
			vec2 pointer = (uMouse - 0.5) * vec2(1.1, 2.0);
			vec2 towardPointer = pointer - c.xy;
			float pointerPull = smoothstep(1.65, 0.0, length(towardPointer));
			c.xy += towardPointer * pointerPull * uLavaMotion.w;
			float radius = (0.19 + 0.08 * hash(fi) + 0.035 * sin(t * 0.36 + fi)) * uLavaShape.y * active;
			d = smin(d, sdSphere(p, c, radius), uLavaShape.w);
		}

		float base = sdSphere(p, vec3(-0.12, -1.35 - uLavaMotion.z * 0.08, 0.0), 0.34 * uLavaShape.y);
		float cap = sdSphere(p, vec3(0.1, 1.48, 0.02), 0.29 * uLavaShape.y);
		return smin(smin(d, base, uLavaShape.w * 1.12), cap, uLavaShape.w);
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
		blobCount: Math.max(1, Math.min(12, Math.round(props.blobCount ?? 10))),
		blobSize: Math.max(0.45, Math.min(1.8, props.blobSize ?? 1)),
		distribution: normalizeDistribution(props.distribution),
		speed: Math.max(0, Math.min(3, props.speed ?? 1)),
		gravity: Math.max(-1, Math.min(1, props.gravity ?? 0)),
		attraction: Math.max(0, Math.min(0.7, props.attraction ?? 0.18)),
		mergeSmoothness: Math.max(0.05, Math.min(0.6, props.mergeSmoothness ?? 0.25)),
	};
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
}: BrandLavaFieldProps) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const highlightsRef = useRef(normalizeHighlights(highlights));
	const lavaControlsRef = useRef(
		normalizeLavaControls({ blobCount, blobSize, distribution, speed, gravity, attraction, mergeSmoothness }),
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
		const onMove = (event: PointerEvent) => {
			const rect = root.getBoundingClientRect();
			targetMouse.x = (event.clientX - rect.left) / rect.width;
			targetMouse.y = 1 - (event.clientY - rect.top) / rect.height;
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
			gl.uniform4f(
				lavaShapeLocation,
				lavaControls.blobCount,
				lavaControls.blobSize,
				lavaControls.distribution,
				lavaControls.mergeSmoothness,
			);
			gl.uniform4f(lavaMotionLocation, lavaControls.speed, 0, lavaControls.gravity, lavaControls.attraction);
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
		root.addEventListener("pointerleave", onLeave);
		window.addEventListener("resize", resize);
		resize();
		animationFrame = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(animationFrame);
			observer.disconnect();
			root.removeEventListener("pointermove", onMove);
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
