import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		index: "src/index.ts",
	},
	platform: "browser",
	format: ["esm"],
	outDir: "dist",
	external: [/^react/, /^react-dom/],
	dts: true,
	sourcemap: true,
	clean: true,
});
