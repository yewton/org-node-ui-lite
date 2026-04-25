import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	globalSetup: "./e2e/global-setup.ts",
	globalTeardown: "./e2e/global-teardown.ts",
	testDir: "./e2e",
	testMatch: ["**/screenshots.spec.ts"],
	timeout: 60_000,
	fullyParallel: false,
	retries: 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev",
		url: "http://localhost:5173",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
