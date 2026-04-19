import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "frontend",
		include: ["packages/frontend/test/**/*.test.{ts,tsx}"],
		environment: "jsdom",
		setupFiles: ["packages/frontend/test/setup.ts"],
		testTimeout: 30000,
		coverage: {
			enabled: true,
			reporter: ["text", "json", "html"],
			include: ["packages/frontend/src/**"],
		},
	},
});
