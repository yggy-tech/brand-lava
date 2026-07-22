import { useEffect, useRef } from "react";

type Rgb = readonly [number, number, number];
type ThemeColors = {
	background: Rgb;
	card: Rgb;
	lavaA: Rgb;
	lavaB: Rgb;
	lavaC: Rgb;
};

function cssColorToRgb(value: string, fallback: Rgb): Rgb {
	const color = value.trim();
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
		float drift = 0.34 + hash(index) * 0.18;
		float level = -1.05 + index * 0.29;
		return vec3(
			cos(phase + 0.7 * sin(t * 0.38 + index * 1.1)) * drift,
			level + sin(phase * 0.9 + t * 0.42) * 0.12,
			cos(phase * 0.67 + t * 0.5) * 0.26
		);
	}

	float mapField(vec3 p, float t) {
		float d = 8.0;

		for (int i = 0; i < 10; i++) {
			float fi = float(i);
			vec3 c = blobCenter(fi, t);
			vec2 pointer = (uMouse - 0.5) * vec2(1.1, 2.0);
			vec2 towardPointer = pointer - c.xy;
			float pointerPull = smoothstep(1.65, 0.0, length(towardPointer));
			c.xy += towardPointer * pointerPull * 0.18;
			float radius = 0.19 + 0.08 * hash(fi) + 0.035 * sin(t * 0.36 + fi);
			d = smin(d, sdSphere(p, c, radius), 0.25);
		}

		float base = sdSphere(p, vec3(-0.12, -1.35, 0.0), 0.34);
		float cap = sdSphere(p, vec3(0.1, 1.48, 0.02), 0.29);
		return smin(smin(d, base, 0.28), cap, 0.24);
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
			float d = mapField(pos, uTime);

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

		if (hit > 0.5) {
			vec3 p = ro + rd * travel;
			vec3 n = normalAt(p, uTime);
			float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
			float light = clamp(dot(n, normalize(vec3(-0.35, 0.7, 0.5))), 0.0, 1.0);
			float glow = 1.0 - clamp(travel / maxDist, 0.0, 1.0);
			float wave = sin(p.y * 3.2 + p.x * 1.25 + uTime * 0.75) * 0.5 + 0.5;

			vec3 lava = mix(uLavaC, uLavaB, smoothstep(0.0, 1.0, wave * 0.22 + light * 0.56));
			lava = mix(lava, uLavaA, fresnel * 0.12 + glow * 0.06);
			lava += uCard * fresnel * 0.08;
			color = lava;
		}

		float vignette = smoothstep(1.35, 0.12, length(uv) * 1.05);
		float dither = fract((gl_FragCoord.x + gl_FragCoord.y * 1.61803398875) * 0.5) - 0.5;
		color += dither / 510.0;
		gl_FragColor = vec4(color * mix(0.86, 1.04, vignette), 1.0);
	}
`;

export function BrandLavaField() {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

			if (
				resolutionLocation === null ||
				timeLocation === null ||
				mouseLocation === null ||
				backgroundLocation === null ||
				cardLocation === null ||
				lavaALocation === null ||
				lavaBLocation === null ||
				lavaCLocation === null ||
				positionLocation < 0
			) {
				throw new Error("Unable to initialize WebGL uniform attributes");
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

			gl["useProgram"](program);
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
				!lavaCLocation
			) {
				return;
			}

			gl["useProgram"](program);
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
