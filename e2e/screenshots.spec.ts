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

	// Fetch the first node ID from the graph API, then open it via the
	// dev-only hook exposed by App.tsx.  This is deterministic and avoids
	// relying on probabilistic canvas-click hit detection.
	const nodeId = await page.evaluate(async () => {
		const resp = await fetch("/api/graph.json");
		const data = (await resp.json()) as { nodes: Array<{ id: string }> };
		return data.nodes[0]?.id ?? null;
	});

	if (nodeId) {
		await page.evaluate(async (id) => {
			const fn = (window as { __openNode?: (id: string) => Promise<void> })
				.__openNode;
			await fn?.(id);
		}, nodeId);

		await waitForOffcanvasOpen(page, DETAILS_PANEL);
		await page.waitForFunction(
			(sel) => {
				const div = document.querySelector(sel);
				return div?.hasChildNodes();
			},
			`${DETAILS_PANEL} [aria-label="Details content"] > div`,
			{ timeout: 10_000 },
		);
	}

	await page.screenshot({ path: join(screenshotsDir, "node-details.png") });
});
