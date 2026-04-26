import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const emacsScript = join(__dirname, "emacs-server.el");
const pidFile = join(repoRoot, ".emacs-server-pid");

const EMACS_PORT = 5174;
const STARTUP_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 500;

export default async function globalSetup() {
	// Create a minimal dist/index.html so org-node-ui-lite-mode's dist check
	// passes if anything calls it.  Playwright uses the Vite dev server instead.
	const distDir = join(repoRoot, "packages", "frontend", "dist");
	mkdirSync(distDir, { recursive: true });
	writeFileSync(join(distDir, "index.html"), "<html></html>");

	const emacs = spawn("emacs", ["--batch", "--load", emacsScript], {
		stdio: ["ignore", "pipe", "pipe"],
	});

	emacs.stdout.on("data", (d: Buffer) => process.stdout.write(`[emacs] ${d}`));
	emacs.stderr.on("data", (d: Buffer) => process.stderr.write(`[emacs] ${d}`));

	emacs.on("exit", (code, signal) => {
		// SIGTERM (code 15 or signal "SIGTERM") is expected from globalTeardown.
		if (signal === "SIGTERM" || code === 15) return;
		if (code !== null && code !== 0) {
			console.error(`[e2e] Emacs exited unexpectedly with code ${code}`);
		}
	});

	// Save PID for teardown.
	writeFileSync(pidFile, String(emacs.pid ?? ""));

	// Poll until the graph API responds with at least one node.
	const deadline = Date.now() + STARTUP_TIMEOUT_MS;
	let ready = false;

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://127.0.0.1:${EMACS_PORT}/api/graph.json`);
			if (res.ok) {
				const data = (await res.json()) as { nodes?: unknown[] };
				if ((data.nodes?.length ?? 0) > 0) {
					ready = true;
					break;
				}
			}
		} catch {
			// Server not yet up — keep polling.
		}
		await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
	}

	if (!ready) {
		emacs.kill();
		throw new Error(
			`Emacs org-node-ui-lite server did not become ready within ${STARTUP_TIMEOUT_MS / 1000}s`,
		);
	}

	console.log(
		`[e2e] Emacs org-node-ui-lite server ready on port ${EMACS_PORT}`,
	);
}
