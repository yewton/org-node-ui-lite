/**
 * E2E tests for org-node-ui-lite.
 *
 * Emacs runs org-node-ui-lite-mode with the fixture org files in e2e/fixtures/.
 * The Vite dev server (port 5173) proxies /api/* to the Emacs HTTP server
 * (port 5174).  No API mocking — all requests hit the real backend.
 */
import { expect, test } from "@playwright/test";

// ── Selectors ─────────────────────────────────────────────────────────────────

// SettingsPanel always remains in the DOM (Bootstrap offcanvas); "show" makes it visible.
const SETTINGS_PANEL = '[role="dialog"].offcanvas-start';
// DetailsPanel is unmounted (returns null) when closed.
const DETAILS_PANEL = '[role="dialog"].offcanvas-end';

const EMACS_PORT = 5174;

// ── App loading ───────────────────────────────────────────────────────────────

test.describe("App loading", () => {
	test("renders the root container", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator(".vh-100.vw-100")).toBeVisible();
	});

	test("fetches the graph API on startup", async ({ page }) => {
		const responsePromise = page.waitForResponse("**/api/graph.json");
		await page.goto("/");
		const response = await responsePromise;
		expect(response.status()).toBe(200);
	});

	test("graph API request URL ends with api/graph.json", async ({ page }) => {
		const responsePromise = page.waitForResponse("**/api/graph.json");
		await page.goto("/");
		const response = await responsePromise;
		expect(response.url()).toMatch(/api\/graph\.json$/);
	});
});

// ── Settings panel ────────────────────────────────────────────────────────────

test.describe("Settings panel", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("settings button is visible in the top-left", async ({ page }) => {
		await expect(page.locator("button.position-fixed").first()).toBeVisible();
	});

	test("settings panel is not shown before the button is clicked", async ({
		page,
	}) => {
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
		await page.goto("/");
	});

	test("details toggle button is visible in the top-right", async ({
		page,
	}) => {
		await expect(page.locator("button.position-fixed").nth(1)).toBeVisible();
	});

	test("details panel is absent from DOM before toggle", async ({ page }) => {
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
		await expect(
			page.locator(DETAILS_PANEL).getByText("Click a node to view details"),
		).toBeVisible();
	});
});

// ── Live API validation ───────────────────────────────────────────────────────

test.describe("Live Emacs API", () => {
	test("graph endpoint returns 30 nodes", async ({ request }) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/graph.json`,
		);
		expect(res.status()).toBe(200);
		const data = (await res.json()) as { nodes: { id: string }[] };
		expect(data.nodes).toHaveLength(30);
	});

	test("graph endpoint returns 31 edges", async ({ request }) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/graph.json`,
		);
		expect(res.status()).toBe(200);
		const data = (await res.json()) as {
			edges: { source: string; dest: string }[];
		};
		expect(data.edges).toHaveLength(31);
	});

	test("every edge references a node that exists in the graph", async ({
		request,
	}) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/graph.json`,
		);
		const data = (await res.json()) as {
			nodes: { id: string }[];
			edges: { source: string; dest: string }[];
		};
		const ids = new Set(data.nodes.map((n) => n.id));
		for (const { source, dest } of data.edges) {
			expect(ids.has(source), `Unknown source: ${source}`).toBe(true);
			expect(ids.has(dest), `Unknown dest: ${dest}`).toBe(true);
		}
	});

	test("node endpoint returns details for math-linear-algebra", async ({
		request,
	}) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/node/math-linear-algebra.json`,
		);
		expect(res.status()).toBe(200);
		const node = (await res.json()) as {
			id: string;
			title: string;
			raw: string;
			backlinks: { source: string; title: string }[];
		};
		expect(node.id).toBe("math-linear-algebra");
		expect(node.title).toBe("Linear Algebra");
		expect(node.raw.length).toBeGreaterThan(0);
		expect(Array.isArray(node.backlinks)).toBe(true);
	});

	test("node endpoint returns backlinks for prog-algorithms", async ({
		request,
	}) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/node/prog-algorithms.json`,
		);
		expect(res.status()).toBe(200);
		const node = (await res.json()) as {
			backlinks: { source: string; title: string }[];
		};
		const sources = node.backlinks.map((b) => b.source);
		expect(sources).toContain("math-linear-algebra");
		expect(sources).toContain("proj-index");
	});

	test("node endpoint returns 404 for an unknown ID", async ({ request }) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/node/nonexistent-id-xyz.json`,
		);
		expect(res.status()).toBe(404);
	});

	// sci-biology node contains [[./img/test.png]].
	// The asset segment is encodeBase64url("./img/test") + ".png".
	test("asset endpoint serves image for sci-biology node", async ({
		request,
	}) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/node/sci-biology/Li9pbWcvdGVzdA.png`,
		);
		expect(res.status()).toBe(200);
		const ct = res.headers()["content-type"] ?? "";
		expect(ct).toMatch(/image\//);
	});

	test("asset endpoint returns 404 for unknown image", async ({ request }) => {
		const res = await request.get(
			`http://localhost:${EMACS_PORT}/api/node/sci-biology/bm9uZXhpc3RlbnQ.png`,
		);
		expect(res.status()).toBe(404);
	});
});
