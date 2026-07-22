import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsdown";

const isWatch = process.argv.includes("--watch");

export default defineConfig({
	entry: {
		index: "src/index.ts",
	},
	platform: "browser",
	format: ["esm"],
	outDir: "dist",
	external: [/^react/, /^react-dom/],
	dts: true,
	exports: !isWatch,
	sourcemap: true,
	clean: !isWatch,
	onSuccess: async () => {
		await new Promise((resolve) => setTimeout(resolve, 100));

		const pkgPath = path.resolve("package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

		pkg.exports = pkg.exports || {};
		if (pkg.exports["./styles.css"] !== "./styles.css") {
			pkg.exports["./styles.css"] = "./styles.css";
			fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
		}
	},
});
