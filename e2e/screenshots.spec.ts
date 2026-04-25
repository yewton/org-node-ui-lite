/**
 * Screenshot generator for the README.
 *
 * Run with:  npm run screenshots
 *
 * Outputs PNG files to docs/screenshots/.  Rerun whenever the UI changes
 * to keep the README images up to date.
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, "..", "docs", "screenshots");

const SETTINGS_PANEL = '[role="dialog"].offcanvas-start';
const DETAILS_PANEL = '[role="dialog"].offcanvas-end';
const GRAPH_CANVAS = ".h-100.w-100 canvas";

mkdirSync(screenshotsDir, { recursive: true });

test.use({
	colorScheme: "dark",
	reducedMotion: "reduce",
	viewport: { width: 1280, height: 800 },
});

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"uiState",
			JSON.stringify({
				theme: "nord-dark",
				renderer: "force-graph",
				nodeSize: 10,
				labelScale: 0.5,
				showLabels: true,
				chargeStrength: -120,
			}),
		);
	});
});

async function waitForGraph(page: Page) {
	await page.locator(GRAPH_CANVAS).waitFor({ state: "visible" });
	// Allow the force simulation to stabilise before snapping.
	await page.waitForTimeout(5000);
}

test("graph view", async ({ page }) => {
	await page.goto("/");
	await waitForGraph(page);
	await page.screenshot({ path: join(screenshotsDir, "graph.png") });
});

test("settings panel", async ({ page }) => {
	await page.goto("/");
	await waitForGraph(page);
	await page.locator("button.position-fixed").first().click();
	await expect(page.locator(SETTINGS_PANEL)).toBeVisible();
	await page.screenshot({ path: join(screenshotsDir, "settings.png") });
});

test("node details", async ({ page }) => {
	await page.goto("/");
	await waitForGraph(page);

	await page.locator("button.position-fixed").nth(1).click();
	await expect(page.locator(DETAILS_PANEL)).toBeVisible();

	// Click at several canvas positions until a node responds.
	const canvas = page.locator(GRAPH_CANVAS).first();
	const box = await canvas.boundingBox();

	if (box) {
		const positions: [number, number][] = [
			[0.5, 0.5],
			[0.35, 0.4],
			[0.65, 0.4],
			[0.35, 0.6],
			[0.65, 0.6],
			[0.5, 0.3],
			[0.5, 0.7],
			[0.25, 0.5],
			[0.75, 0.5],
			[0.4, 0.35],
			[0.6, 0.65],
			[0.45, 0.55],
		];

		for (const [rx, ry] of positions) {
			const responsePromise = page.waitForResponse(
				(res) =>
					res.url().includes("/api/node/") && res.url().endsWith(".json"),
				{ timeout: 1500 },
			);
			await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
			try {
				await responsePromise;
				await page.waitForTimeout(800);
				break;
			} catch {
				// No node at this position — try the next one.
			}
		}
	}

	await page.screenshot({ path: join(screenshotsDir, "node-details.png") });
});
