export const vertexSource = `
	attribute vec2 aPosition;

	void main() {
		gl_Position = vec4(aPosition, 0.0, 1.0);
	}
`;

export const fragmentSource = `
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
	uniform vec4 uConnectionStart[12];
	uniform vec4 uConnectionEnd[12];
	uniform vec4 uDepthOfField;

	float smin(float a, float b, float k) {
		float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
		return mix(b, a, h) - k * h * (1.0 - h);
	}

	float sdSphere(vec3 p, vec3 c, float r) {
		vec3 offset = p - c;
		offset.z *= 0.42;
		return length(offset) - r;
	}

	float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
		vec3 pa = p - a;
		vec3 ba = b - a;
		float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
		return length(pa - ba * h) - r;
	}

	float mapField(vec3 p, float t) {
		float d = 8.0;

		for (int i = 0; i < 12; i++) {
			vec4 sphere = uBlobSpheres[i];
			if (sphere.w > 0.001) {
				d = smin(d, sdSphere(p, sphere.xyz, sphere.w), uLavaShape.w);
			}
		}

		for (int i = 0; i < 12; i++) {
			vec4 start = uConnectionStart[i];
			vec4 end = uConnectionEnd[i];
			if (end.w > 0.0) {
				d = smin(d, sdCapsule(p, start.xyz, end.xyz, start.w), end.w);
			}
		}

		return d;
	}

	vec3 normalAt(vec3 p, float t) {
		vec2 e = vec2(0.0022, 0.0);
		return normalize(vec3(
			mapField(p + e.xyy, t) - mapField(p - e.xyy, t),
			mapField(p + e.yxy, t) - mapField(p - e.yxy, t),
			mapField(p + e.yyx, t) - mapField(p - e.yyx, t)
		));
	}

	vec3 shadeRay(vec2 uv, float time, out float travelOut, out float hitOut) {
		vec3 ro = vec3(uv * 1.42, 4.45);
		vec3 rd = vec3(0.0, 0.0, -1.0);
		float travel = 0.0;
		float hit = 0.0;
		float maxDist = 7.0;

		for (int i = 0; i < 68; i++) {
			vec3 pos = ro + rd * travel;
			float d = mapField(pos, time * uLavaMotion.x);

			if (d < 0.0032) {
				hit = 1.0;
				break;
			}

			travel += max(0.004, d * 0.52);
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

		vec3 p = ro + rd * travel;
		if (hit > 0.5) {
			vec3 n = normalAt(p, time * uLavaMotion.x);
			float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
			float light = clamp(dot(n, normalize(vec3(-0.35, 0.7, 0.5))), 0.0, 1.0);
			float glow = 1.0 - clamp(travel / maxDist, 0.0, 1.0);
			float wave = sin(p.y * 3.2 + p.x * 1.25 + time * 0.75) * 0.5 + 0.5;

			vec3 lava = mix(uLavaC, uLavaB, smoothstep(0.0, 1.0, wave * 0.22 + light * 0.56));
			lava = mix(lava, uLavaA, fresnel * 0.12 + glow * 0.06);
			lava += uCard * fresnel * 0.08;
			lava = mix(lava, uCursorLightColor, cursorLight * 0.18);
			color = lava;
		}

		travelOut = travel;
		hitOut = hit;
		return color;
	}

	void main() {
		vec2 uv = (gl_FragCoord.xy / uResolution.xy - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
		vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
		float travel = 0.0;
		float hit = 0.0;
		vec3 color = shadeRay(uv, uTime, travel, hit);
		for (int i = 0; i < 4; i++) {
			vec4 highlight = uHighlights[i];
			float area = smoothstep(highlight.z, 0.0, length(screenUv - highlight.xy)) * highlight.w;
			color = mix(color, uHighlightColors[i], area);
			color += uHighlightColors[i] * area * 0.16;
		}

		float vignette = smoothstep(1.35, 0.12, length(uv) * 1.05);
		float dither = fract((gl_FragCoord.x + gl_FragCoord.y * 1.61803398875) * 0.5) - 0.5;
		color += dither / 510.0;
		float encodedDepth = hit * (0.02 + clamp(travel / 7.0, 0.0, 1.0) * 0.98);
		float outputAlpha = mix(1.0, encodedDepth, step(0.5, uDepthOfField.w));
		gl_FragColor = vec4(color * mix(0.86, 1.04, vignette), outputAlpha);
	}
`;

export const blurFragmentSource = `
	precision highp float;

	uniform sampler2D uTexture;
	uniform vec2 uResolution;
	uniform vec2 uDirection;
	uniform float uStrength;

	void main() {
		vec2 uv = gl_FragCoord.xy / uResolution.xy;
		vec2 stepSize = uDirection / uResolution.xy * mix(1.0, 6.0, clamp(uStrength / 4.0, 0.0, 1.0));
		vec4 color = texture2D(uTexture, uv) * 0.2270270270;
		color += texture2D(uTexture, uv + stepSize * 1.3846153846) * 0.1581081081;
		color += texture2D(uTexture, uv - stepSize * 1.3846153846) * 0.1581081081;
		color += texture2D(uTexture, uv + stepSize * 3.2307692308) * 0.0351351351;
		color += texture2D(uTexture, uv - stepSize * 3.2307692308) * 0.0351351351;
		color += texture2D(uTexture, uv + stepSize * 5.1764705882) * 0.0117567568;
		color += texture2D(uTexture, uv - stepSize * 5.1764705882) * 0.0117567568;
		color += texture2D(uTexture, uv + stepSize * 7.1176470588) * 0.0054864865;
		color += texture2D(uTexture, uv - stepSize * 7.1176470588) * 0.0054864865;
		color /= 0.648;
		gl_FragColor = color;
	}
`;

export const compositeFragmentSource = `
	precision highp float;

	uniform sampler2D uSharpTexture;
	uniform sampler2D uBlurTexture;
	uniform vec2 uResolution;
	uniform vec2 uMouse;
	uniform vec4 uDepthOfField;
	uniform float uStrength;

	void main() {
		vec2 uv = gl_FragCoord.xy / uResolution.xy;
		vec4 sharp = texture2D(uSharpTexture, uv);
		vec4 blurred = texture2D(uBlurTexture, uv);
		float surfaceDepth = max(0.0, (sharp.a - 0.02) / 0.98) * 7.0;
		float cursorSample = texture2D(uSharpTexture, uMouse).a;
		float cursorDepth = max(0.0, (cursorSample - 0.02) / 0.98) * 7.0;
		float dynamic = uDepthOfField.w;
		float focalDepth = mix(uDepthOfField.x, cursorDepth, dynamic);
		float cursorHasSurface = step(0.01, cursorSample);
		float dynamicGate = mix(1.0, cursorHasSurface, dynamic);
		float depthDelta = abs(surfaceDepth - focalDepth);
		float focalBand = max(0.025, uDepthOfField.y * 0.28);
		float mask = step(0.01, sharp.a)
			* smoothstep(focalBand * 0.18, focalBand, depthDelta)
			* dynamicGate
			* smoothstep(0.0, 0.45, uStrength);
		gl_FragColor = vec4(mix(sharp.rgb, blurred.rgb, mask), 1.0);
	}
`;
