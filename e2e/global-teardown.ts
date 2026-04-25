import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const pidFile = join(repoRoot, ".emacs-server-pid");

export default async function globalTeardown() {
	if (!existsSync(pidFile)) return;

	const raw = readFileSync(pidFile, "utf-8").trim();
	const pid = Number.parseInt(raw, 10);

	if (!Number.isNaN(pid) && pid > 0) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// Process may have already exited.
		}
	}

	unlinkSync(pidFile);
}
