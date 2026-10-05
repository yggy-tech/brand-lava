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
	uniform vec4 uCursorLight;
	uniform vec3 uCursorLightColor;
	uniform vec4 uLavaShape;
	uniform vec4 uLavaMotion;
	uniform vec4 uCamera;
	uniform vec4 uBlobSpheres[12];
	uniform vec4 uStaticSpheres[3];
	// x: fill, y: outline, z: outline width, w: one pixel (scene units)
	uniform vec4 uStyle;
	uniform vec3 uOutlineColor;
	uniform float uTransparent;
	// x: centre glow strength, y: edge vignette strength (both 0 to 1).
	uniform vec2 uAtmosphere;

	// Premultiplied "over": paint color at coverage a on top of dst.
	vec4 over(vec4 dst, vec3 color, float a) {
		return vec4(color * a, a) + dst * (1.0 - a);
	}

	float smin(float a, float b, float k) {
		float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
		return mix(b, a, h) - k * h * (1.0 - h);
	}

	float sdSphere(vec3 p, vec3 c, float r) {
		vec3 offset = p - c;
		offset.z *= 0.42;
		return length(offset) - r;
	}

	float mapField(vec3 p, float t) {
		float d = 8.0;

		for (int i = 0; i < 12; i++) {
			vec4 sphere = uBlobSpheres[i];
			if (sphere.w > 0.001) {
				d = smin(d, sdSphere(p, sphere.xyz, sphere.w), uLavaShape.w);
			}
		}

		for (int i = 0; i < 3; i++) {
			vec4 sphere = uStaticSpheres[i];
			if (sphere.w > 0.001) {
				d = smin(d, sdSphere(p, sphere.xyz, sphere.w), uLavaShape.w);
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

	vec4 shadeRay(vec2 uv, float time) {
		vec3 orthographicOrigin = vec3(uv * uCamera.z, uCamera.y);
		vec3 perspectiveDirection = normalize(vec3(uv * uCamera.z, -uCamera.w));
		vec3 ro = mix(orthographicOrigin, vec3(0.0, 0.0, uCamera.y), uCamera.x);
		vec3 rd = mix(vec3(0.0, 0.0, -1.0), perspectiveDirection, uCamera.x);
		float travel = 0.0;
		float hit = 0.0;
		float maxDist = 7.0;
		float closest = 8.0;

		// Near-miss rays creep along the silhouette; the outline needs their closest approach.
		for (int i = 0; i < 112; i++) {
			if (i >= 68 && uStyle.y < 0.5) {
				break;
			}
			vec3 pos = ro + rd * travel;
			float d = mapField(pos, time * uLavaMotion.x);
			closest = min(closest, d);

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
		color = mix(color, uLavaB, warm * 0.16 * uAtmosphere.x);
		vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
		float cursorLight = smoothstep(uCursorLight.z, 0.0, length(screenUv - uMouse)) * uCursorLight.w;

		vec4 result = vec4(color, 1.0) * (1.0 - uTransparent);
		vec3 p = ro + rd * travel;
		if (hit > 0.5) {
			vec3 n = normalAt(p, time * uLavaMotion.x);
			float grazing = 1.0 - max(dot(n, -rd), 0.0);
			float fresnel = grazing * grazing;
			float light = clamp(dot(n, normalize(vec3(-0.35, 0.7, 0.5))), 0.0, 1.0);
			float glow = 1.0 - clamp(travel / maxDist, 0.0, 1.0);
			float wave = sin(p.y * 3.2 + p.x * 1.25 + time * 0.75) * 0.5 + 0.5;

			vec3 lava = mix(uLavaC, uLavaB, smoothstep(0.0, 1.0, wave * 0.22 + light * 0.56));
			lava = mix(lava, uLavaA, fresnel * 0.12 + glow * 0.06);
			lava += uCard * fresnel * 0.08;
			lava = mix(lava, uCursorLightColor, cursorLight * 0.18);
			if (uStyle.x > 0.5) {
				result = over(result, lava, 1.0);
			}
			// Soft inner edge at the silhouette so the band does not alias.
			result = over(result, uOutlineColor, uStyle.y * smoothstep(0.82, 1.0, grazing));
		} else {
			float band = 1.0 - smoothstep(uStyle.z - uStyle.w * 0.5, uStyle.z + uStyle.w * 0.5, closest);
			result = over(result, uOutlineColor, uStyle.y * band);
		}

		return result;
	}

	void main() {
		vec2 uv = (gl_FragCoord.xy / uResolution.xy - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
		vec4 color = shadeRay(uv, uTime);

		float vignette = smoothstep(1.35, 0.12, length(uv) * 1.05);
		float dither = fract((gl_FragCoord.x + gl_FragCoord.y * 1.61803398875) * 0.5) - 0.5;
		vec3 rgb = (color.rgb + dither / 510.0 * color.a) * mix(1.0, mix(0.86, 1.04, vignette), uAtmosphere.y);
		gl_FragColor = vec4(min(rgb, vec3(color.a)), color.a);
	}
`;
