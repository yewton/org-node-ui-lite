/**
 * E2E tests for the org-node-ui-lite frontend.
 *
 * All backend API calls are intercepted and fulfilled with the 30-node sample
 * dataset so the tests run without a live Emacs httpd process.
 */
import { expect, test } from "@playwright/test";
import {
	SAMPLE_GRAPH,
	SAMPLE_NODES,
} from "../packages/frontend/test/fixtures/sampleNodes.ts";

// ── Selectors ─────────────────────────────────────────────────────────────────

// SettingsPanel always remains in the DOM (Bootstrap offcanvas); "show" makes it visible.
const SETTINGS_PANEL = '[role="dialog"].offcanvas-start';
// DetailsPanel is unmounted (returns null) when closed so its locator uniquely
// identifies it when open.
const DETAILS_PANEL = '[role="dialog"].offcanvas-end';

// ── Shared setup ──────────────────────────────────────────────────────────────

async function mockApi(page: import("@playwright/test").Page) {
	// Graph endpoint: returns all 30 nodes + 31 edges
	await page.route("**/api/graph.json", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(SAMPLE_GRAPH),
		}),
	);

	// Node detail endpoint: matches /api/node/<id>.json
	await page.route("**/api/node/*.json", (route) => {
		const url = route.request().url();
		const match = url.match(/api\/node\/(.+?)\.json/);
		const id = match?.[1];
		const node = id ? SAMPLE_NODES[id] : undefined;
		if (node) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(node),
			});
		}
		return route.fulfill({
			status: 404,
			contentType: "application/json",
			body: JSON.stringify({ error: "not_found" }),
		});
	});
}

// ── App loading ───────────────────────────────────────────────────────────────

test.describe("App loading", () => {
	test.beforeEach(async ({ page }) => {
		await mockApi(page);
		await page.goto("/");
	});

	test("renders the root container", async ({ page }) => {
		await expect(page.locator(".vh-100.vw-100")).toBeVisible();
	});

	test("calls the graph API on startup", async ({ page }) => {
		let called = false;
		await page.route("**/api/graph.json", (route) => {
			called = true;
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(SAMPLE_GRAPH),
			});
		});
		await page.reload();
		await page.waitForLoadState("domcontentloaded");
		expect(called).toBe(true);
	});

	test("graph API request URL ends with api/graph.json", async ({ page }) => {
		let capturedUrl = "";
		await page.route("**/api/graph.json", (route) => {
			capturedUrl = route.request().url();
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(SAMPLE_GRAPH),
			});
		});
		await page.reload();
		await page.waitForLoadState("domcontentloaded");
		expect(capturedUrl).toMatch(/api\/graph\.json$/);
	});
});

// ── Settings panel ────────────────────────────────────────────────────────────

test.describe("Settings panel", () => {
	test.beforeEach(async ({ page }) => {
		await mockApi(page);
		await page.goto("/");
	});

	test("settings button is visible in the top-left", async ({ page }) => {
		// The gear button is the first position-fixed button (left: 1rem)
		await expect(page.locator("button.position-fixed").first()).toBeVisible();
	});

	test("settings panel is not shown before the button is clicked", async ({
		page,
	}) => {
		// SettingsPanel is in the DOM but Bootstrap hides it without the "show" class
		await expect(page.locator(SETTINGS_PANEL)).not.toBeVisible();
	});

	test("clicking the settings button opens the settings panel", async ({
		page,
	}) => {
		await page.locator("button.position-fixed").first().click();
		await expect(page.locator(SETTINGS_PANEL)).toBeVisible();
	});

	test("settings panel shows the Settings title", async ({ page }) => {
		await page.locator("button.position-fixed").first().click();
		await expect(
			page.locator(SETTINGS_PANEL).getByText("Settings"),
		).toBeVisible();
	});

	test("settings panel contains Theme control", async ({ page }) => {
		await page.locator("button.position-fixed").first().click();
		await expect(page.locator(SETTINGS_PANEL).getByText("Theme")).toBeVisible();
	});

	test("settings panel contains Renderer control", async ({ page }) => {
		await page.locator("button.position-fixed").first().click();
		await expect(
			page.locator(SETTINGS_PANEL).getByText("Renderer"),
		).toBeVisible();
	});

	test("settings panel contains Node size control", async ({ page }) => {
		await page.locator("button.position-fixed").first().click();
		await expect(
			page.locator(SETTINGS_PANEL).getByText("Node size"),
		).toBeVisible();
	});

	test("close button dismisses the settings panel", async ({ page }) => {
		await page.locator("button.position-fixed").first().click();
		await expect(page.locator(SETTINGS_PANEL)).toBeVisible();

		await page.locator(SETTINGS_PANEL).getByLabel("Close").click();
		await expect(page.locator(SETTINGS_PANEL)).not.toBeVisible();
	});
});

// ── Details panel ─────────────────────────────────────────────────────────────

test.describe("Details panel", () => {
	test.beforeEach(async ({ page }) => {
		await mockApi(page);
		await page.goto("/");
	});

	test("details toggle button is visible in the top-right", async ({
		page,
	}) => {
		// The chevron button is the second position-fixed button (right: 1rem)
		await expect(page.locator("button.position-fixed").nth(1)).toBeVisible();
	});

	test("details panel is absent from DOM before toggle", async ({ page }) => {
		// DetailsPanel returns null when closed, so it is not in the DOM at all
		await expect(page.locator(DETAILS_PANEL)).not.toBeAttached();
	});

	test("clicking the details toggle mounts the details panel", async ({
		page,
	}) => {
		await page.locator("button.position-fixed").nth(1).click();
		await expect(page.locator(DETAILS_PANEL)).toBeVisible();
	});

	test("details panel can be closed via its Close button", async ({ page }) => {
		await page.locator("button.position-fixed").nth(1).click();
		await expect(page.locator(DETAILS_PANEL)).toBeVisible();

		await page.locator(DETAILS_PANEL).getByLabel("Close").click();
		await expect(page.locator(DETAILS_PANEL)).not.toBeAttached();
	});

	test("details panel shows default title when no node is selected", async ({
		page,
	}) => {
		await page.locator("button.position-fixed").nth(1).click();
		// Initial selected is {} so title falls back to this prompt text
		await expect(
			page.locator(DETAILS_PANEL).getByText("Click a node to view details"),
		).toBeVisible();
	});
});

// ── API mock validation ───────────────────────────────────────────────────────

test.describe("Sample data fixture validation", () => {
	test("SAMPLE_GRAPH has 30 nodes", () => {
		expect(SAMPLE_GRAPH.nodes).toHaveLength(30);
	});

	test("SAMPLE_GRAPH has 31 edges", () => {
		expect(SAMPLE_GRAPH.edges).toHaveLength(31);
	});

	test("SAMPLE_NODES covers all 30 IDs", () => {
		const keys = Object.keys(SAMPLE_NODES);
		expect(keys).toHaveLength(30);
		for (const { id } of SAMPLE_GRAPH.nodes) {
			expect(keys).toContain(id);
		}
	});

	test("every edge references existing node IDs", () => {
		const ids = new Set(SAMPLE_GRAPH.nodes.map((n) => n.id));
		for (const { source, dest } of SAMPLE_GRAPH.edges) {
			expect(ids.has(source), `Unknown source: ${source}`).toBe(true);
			expect(ids.has(dest), `Unknown dest: ${dest}`).toBe(true);
		}
	});
});
