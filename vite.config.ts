import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./", import.meta.url)),
		},
	},
	plugins: [
		tailwindcss(),
		vinext({
			cache: { data: kvDataAdapter(), cdn: cdnAdapter() },
			images: { optimizer: imagesOptimizer() },
			prerender: { routes: "*" },
		}),
		cloudflare({
			viteEnvironment: {
				name: "rsc",
				childEnvironments: ["ssr"],
			},
		}),
	],
});
