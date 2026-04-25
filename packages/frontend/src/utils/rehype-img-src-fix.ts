import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { encodeBase64url } from "./base64url.ts";

const IGNORE_PATTERN =
	/^(data:|https?:|\/\/|\.\/api\/node\/|\/api\/node\/|#|\s*$)/;
const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|gif|svg|webp|tiff|bmp|ico)$/i;

function stripFilePrefix(raw: string): string {
	return raw.startsWith("file:") ? raw.slice(5) : raw;
}

function toApiSrc(path: string, nodeId: string): string {
	const [base, extension = ""] = path.split(/(?=\.[^.]+$)/);
	if (!base) return path;
	return `./api/node/${nodeId}/${encodeBase64url(base)}${extension}`;
}

/**
 * Rewrite local image references to point to the resource API.
 *
 * - `<img src="...">` — rewrites src to `./api/node/{nodeId}/{b64url}{ext}`
 * - `<a href="...image-ext">` — rewrites href so org links with descriptions
 *   (e.g. `[[./img/a.jpg][caption]]`) resolve correctly
 *
 * Strips the `file:` prefix that uniorg-rehype emits for explicit
 * `[[file:./img/a.jpg]]` links before encoding.
 *
 * @param nodeId - Node identifier used in the URL
 * @returns Transformer for the rehype pipeline
 */
export default function rehypeImgSrcFix(nodeId: string): (tree: Root) => void {
	return (tree: Root) => {
		visit(tree, "element", (node: Element) => {
			if (node.tagName === "img") {
				if (typeof node.properties?.src !== "string") return;
				const path = stripFilePrefix(node.properties.src.trim());
				if (IGNORE_PATTERN.test(path)) return;
				node.properties.src = toApiSrc(path, nodeId);
			} else if (node.tagName === "a") {
				if (typeof node.properties?.href !== "string") return;
				const path = stripFilePrefix(node.properties.href.trim());
				if (IGNORE_PATTERN.test(path) || !IMAGE_EXT_PATTERN.test(path)) return;
				node.properties.href = toApiSrc(path, nodeId);
			}
		});
	};
}
