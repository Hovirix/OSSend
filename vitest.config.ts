import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: [
			"**/.direnv/**",
			"**/.next/**",
			"**/dist/**",
			"**/node_modules/**",
		],
	},
});
