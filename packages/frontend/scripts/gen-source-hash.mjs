import { createHash } from "node:crypto";
import { globSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const frontendDir = resolve(import.meta.dirname, "..");
const outputFile = join(frontendDir, ".source-hash");

const files = globSync("**", {
	cwd: frontendDir,
	exclude: (p) =>
		p === "node_modules" ||
		p.startsWith("node_modules/") ||
		p === "dist" ||
		p.startsWith("dist/") ||
		p === ".source-hash",
})
	.filter((f) => {
		try {
			return statSync(join(frontendDir, f)).isFile();
		} catch {
			return false;
		}
	})
	.sort();

const outer = createHash("sha256");
for (const rel of files) {
	const content = readFileSync(join(frontendDir, rel));
	const inner = createHash("sha256").update(content).digest("hex");
	outer.update(`${rel}:${inner}\n`);
}

writeFileSync(outputFile, `${outer.digest("hex")}\n`);
