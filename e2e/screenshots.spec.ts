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
import { type Page, test } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, "..", "docs", "screenshots");

const SETTINGS_PANEL = '[role="dialog"].offcanvas-start';
const DETAILS_PANEL = '[role="dialog"].offcanvas-end';
const GRAPH_CANVAS = ".h-100.w-100 canvas";

mkdirSync(screenshotsDir, { recursive: true });

test.use({
	colorScheme: "dark",
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
	// Disable CSS transitions so panel open/close is instant and deterministic.
	await page.addStyleTag({
		content:
			"*, *::before, *::after { transition: none !important; animation-duration: 0s !important; }",
	});
	// Allow the force simulation to stabilise before snapping.
	await page.waitForTimeout(5000);
}

// Waits until the offcanvas panel is fully open (transform has reached none).
async function waitForOffcanvasOpen(page: Page, selector: string) {
	await page.waitForFunction((sel) => {
		const el = document.querySelector(sel);
		if (!el) return false;
		const style = window.getComputedStyle(el);
		if (style.visibility !== "visible") return false;
		const t = style.transform;
		return t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)";
	}, selector);
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
	await waitForOffcanvasOpen(page, SETTINGS_PANEL);
	await page.screenshot({ path: join(screenshotsDir, "settings.png") });
});

test("node details", async ({ page }) => {
	await page.goto("/");
	await waitForGraph(page);

	// Click canvas positions until a node is found.  Clicking a graph node
	// automatically opens the details panel with the processed body — so we
	// do NOT open the panel first (the open panel would occlude the right
	// portion of the canvas and intercept our clicks).
	const canvas = page.locator(GRAPH_CANVAS).first();
	const box = await canvas.boundingBox();

	if (box) {
		// Dense grid covering the center region where force-graph nodes settle.
		const positions: [number, number][] = [
			[0.5, 0.5],
			[0.4, 0.4],
			[0.6, 0.4],
			[0.4, 0.6],
			[0.6, 0.6],
			[0.5, 0.35],
			[0.5, 0.65],
			[0.3, 0.5],
			[0.7, 0.5],
			[0.35, 0.35],
			[0.65, 0.65],
			[0.35, 0.65],
			[0.65, 0.35],
			[0.45, 0.45],
			[0.55, 0.45],
			[0.45, 0.55],
			[0.55, 0.55],
			[0.5, 0.42],
			[0.5, 0.58],
			[0.42, 0.5],
			[0.58, 0.5],
			[0.25, 0.4],
			[0.75, 0.4],
			[0.25, 0.6],
			[0.75, 0.6],
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
				// Node found — wait for the panel to open and body to render.
				await waitForOffcanvasOpen(page, DETAILS_PANEL);
				await page.waitForFunction(
					(sel) => {
						const div = document.querySelector(sel);
						return div?.hasChildNodes();
					},
					`${DETAILS_PANEL} [aria-label="Details content"] > div`,
					{ timeout: 10_000 },
				);
				break;
			} catch {
				// No node at this position — try the next one.
			}
		}
	}

	await page.screenshot({ path: join(screenshotsDir, "node-details.png") });
});
