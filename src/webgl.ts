export function createShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader {
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

export function activateProgram(gl: WebGLRenderingContext, program: WebGLProgram) {
	const useWebGlProgram = Reflect.get(gl, "useProgram") as WebGLRenderingContext["useProgram"];
	useWebGlProgram.call(gl, program);
}

export function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
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
