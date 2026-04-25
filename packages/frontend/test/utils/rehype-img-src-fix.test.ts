import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";
import { describe, expect, test } from "vitest";
import { encodeBase64url } from "../../src/utils/base64url.ts";
import rehypeImgSrcFix from "../../src/utils/rehype-img-src-fix.ts";

const NODE_ID = "test-node-id";

function apiSrc(path: string): string {
	const [base, ext = ""] = path.split(/(?=\.[^.]+$)/);
	return `./api/node/${NODE_ID}/${encodeBase64url(base ?? "")}${ext}`;
}

async function processOrg(orgContent: string): Promise<string> {
	const result = await unified()
		.use(uniorgParse)
		.use(uniorgRehype)
		.use(rehypeImgSrcFix, NODE_ID)
		.use(rehypeStringify)
		.process(orgContent);
	return String(result);
}

describe("rehypeImgSrcFix", () => {
	test("rewrites relative image src (plain link)", async () => {
		const html = await processOrg("[[./img/a.jpg]]");
		expect(html).toContain(`src="${apiSrc("./img/a.jpg")}"`);
	});

	test("rewrites image src without leading ./", async () => {
		const html = await processOrg("[[img/a.png]]");
		expect(html).toContain(`src="${apiSrc("img/a.png")}"`);
	});

	test("strips file: prefix and rewrites src (file: link)", async () => {
		const html = await processOrg("[[file:./img/a.jpg]]");
		expect(html).toContain(`src="${apiSrc("./img/a.jpg")}"`);
		expect(html).not.toContain("file:");
	});

	test("strips file: prefix without ./ (file:relative)", async () => {
		const html = await processOrg("[[file:img/a.jpg]]");
		expect(html).toContain(`src="${apiSrc("img/a.jpg")}"`);
		expect(html).not.toContain("file:");
	});

	test("does not rewrite https:// image URLs", async () => {
		const html = await processOrg("[[https://example.com/img.jpg]]");
		expect(html).not.toContain("/api/node/");
		expect(html).toContain("https://example.com/img.jpg");
	});

	test("rewrites href of image link with description", async () => {
		const html = await processOrg("[[./img/a.jpg][見る]]");
		expect(html).toContain(`href="${apiSrc("./img/a.jpg")}"`);
	});

	test("rewrites href of file: image link with description", async () => {
		const html = await processOrg("[[file:./img/a.png][見る]]");
		expect(html).toContain(`href="${apiSrc("./img/a.png")}"`);
		expect(html).not.toContain("file:");
	});

	test("does not rewrite non-image link with description", async () => {
		const html = await processOrg("[[./docs/readme.org][readme]]");
		expect(html).not.toContain("/api/node/");
	});

	test("does not rewrite https link with description", async () => {
		const html = await processOrg("[[https://example.com][link]]");
		expect(html).not.toContain("/api/node/");
		expect(html).toContain("https://example.com");
	});

	test("works with #+CAPTION before image link", async () => {
		const html = await processOrg("#+CAPTION: My image\n[[./img/a.jpg]]");
		expect(html).toContain(`src="${apiSrc("./img/a.jpg")}"`);
	});

	test("does not double-encode already-rewritten src", async () => {
		const already = apiSrc("./img/a.jpg");
		const html = await processOrg(
			`#+begin_export html\n<img src="${already}">\n#+end_export`,
		);
		expect(html).not.toContain(`/api/node/${NODE_ID}/api/node/`);
	});
});
