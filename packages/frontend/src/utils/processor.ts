import type { ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { RehypeMermaidOptions } from "rehype-mermaid";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";

type Detect = {
	mermaid: boolean;
	math: boolean;
	languages: string[];
};

const MERMAID_RE = /#\+begin_src\s+mermaid/i;
const MATH_RE = /\$[^\n$]+\$|\\\(|\\\[/m;

function detect(orgContent: string): Detect {
	// /g regex with exec() must be created locally — lastIndex is stateful
	const languageRegex = /^#\+begin_src\s+(\S+)/gm;
	const languages = new Set<string>();
	let match = languageRegex.exec(orgContent);
	while (match) {
		if (match[1]) {
			languages.add(match[1]);
		}
		match = languageRegex.exec(orgContent);
	}

	return {
		mermaid: MERMAID_RE.test(orgContent),
		math: MATH_RE.test(orgContent),
		languages: [...languages],
	};
}

type Process = (str: string) => Promise<ReactNode>;

/**
 * Create a processor that converts Org markup into a ReactNode.
 *
 * @param theme - Color theme
 * @param nodeId - Node identifier used for resource links
 * @returns Function that processes an Org string to a ReactNode
 */
export function createOrgHtmlProcessor<Theme extends string>(
	theme: Theme,
	nodeId: string,
): Process {
	return async (orgContent: string) => {
		const [{ default: rehypeImgSrcFix }, { default: rehypeClassNames }] =
			await Promise.all([
				import("./rehype-img-src-fix.ts"),
				import("rehype-class-names"),
			]);

		const detected = detect(orgContent);

		const processor = unified()
			.use(uniorgParse)
			.use(uniorgRehype)
			.use(rehypeRaw)
			.use(rehypeImgSrcFix, nodeId);

		if (detected.math) {
			const { default: rehypeMathJax } = await import("rehype-mathjax");
			processor.use(rehypeMathJax);
		}

		if (detected.mermaid) {
			const mod = await import("rehype-mermaid");
			const rehypeMermaid = mod.default;
			processor.use(rehypeMermaid, {
				strategy: "img-svg",
				dark: theme.endsWith("dark"),
			} as RehypeMermaidOptions);
		}

		if (detected.languages.length > 0) {
			const [
				{ transformerCopyButton },
				{ default: rehypePrettyCode },
				{ getSingletonHighlighter },
			] = await Promise.all([
				import("@rehype-pretty/transformers"),
				import("rehype-pretty-code"),
				import("shiki"),
			]);
			const highlighter = await getSingletonHighlighter({
				themes: [theme.endsWith("dark") ? "vitesse-dark" : "vitesse-light"],
			});
			await Promise.all(
				detected.languages.map(async (l) => {
					try {
						await highlighter.loadLanguage(l as never);
					} catch {
						/* ignore unknown languages */
					}
				}),
			);
			processor.use(rehypePrettyCode, {
				theme: theme.endsWith("dark") ? "vitesse-dark" : "vitesse-light",
				getHighlighter: () => Promise.resolve(highlighter),
				transformers: [
					transformerCopyButton({
						visibility: "always",
						feedbackDuration: 3_000,
					}),
				],
			});
		}

		processor
			.use(rehypeClassNames, {
				table: "table table-bordered table-hover",
				blockquote: "blockquote",
			})
			.use(rehypeReact, {
				Fragment,
				jsx,
				jsxs,
				elementAttributeNameCase: "react",
			});

		return (await processor.process(orgContent)).result;
	};
}
