import type { Core } from "cytoscape";
import { alphaColor } from "../utils/style.ts";
import type { GraphInstance, GraphLink, GraphNode } from "./graph-types.ts";

/**
 * Highlight the neighborhood of the given node while dimming others.
 *
 * @param graph - Graph instance
 * @param focusId - Node id to highlight
 */
export function highlightNeighborhood(
	graph: GraphInstance | undefined | Record<string, unknown>,
	focusId: string,
): void {
	if (!graph) return;

	const graphObj = graph as {
		elements?: () => { forEach: (fn: (el: unknown) => void) => void };
		$id?: (id: string) => {
			closedNeighborhood?: () => { has: (el: unknown) => boolean };
		};
		graphData?: () => { nodes: GraphNode[]; links: GraphLink[] };
		nodeColor?: (fn: (node: GraphNode) => string) => void;
		linkColor?: (fn: (link: GraphLink) => string) => void;
	};

	if (typeof graphObj.elements === "function") {
		const focus = graphObj.$id?.(focusId);
		const neighborhood = focus?.closedNeighborhood?.();
		graphObj.elements().forEach((el: unknown) => {
			const element = el as {
				style: (prop: string, value: number) => void;
				isNode: () => boolean;
			};
			const isNeighbor = neighborhood?.has(el);
			element.style("opacity", isNeighbor ? 1 : element.isNode() ? 0.15 : 0.05);
		});
		return;
	}

	const data = graphObj.graphData?.();
	if (!data) return;

	const neighbors = new Set<string>([focusId]);
	data.links.forEach((l) => {
		const s = typeof l.source === "object" ? l.source.id : l.source;
		const t = typeof l.target === "object" ? l.target.id : l.target;
		if (String(s) === focusId) neighbors.add(String(t));
		if (String(t) === focusId) neighbors.add(String(s));
	});
	graphObj.nodeColor?.((node: GraphNode) =>
		neighbors.has(String(node.id)) ? node.color : alphaColor(node.color, 0.15),
	);
	graphObj.linkColor?.((link: GraphLink) => {
		const s = typeof link.source === "object" ? link.source.id : link.source;
		const t = typeof link.target === "object" ? link.target.id : link.target;
		const related = neighbors.has(String(s)) && neighbors.has(String(t));
		return related ? link.color : alphaColor(link.color, 0.05);
	});
}

/**
 * Apply style properties to all elements in the graph.
 *
 * @param graph - Cytoscape instance
 * @param style - CSS properties to apply
 */
export function applyElementsStyle(
	graph: Core | undefined | Record<string, unknown>,
	style: Record<string, unknown>,
): void {
	for (const [key, value] of Object.entries(style)) {
		const coreGraph = graph as {
			elements?: () => { style: (k: string, v: unknown) => void };
		};
		coreGraph?.elements?.()?.style(key, value);
	}
}

/**
 * Apply style properties to all nodes in the graph.
 *
 * @param graph - Cytoscape instance
 * @param style - CSS properties to apply
 */
export function applyNodeStyle(
	graph: Core | undefined | Record<string, unknown>,
	style: Record<string, unknown>,
): void {
	const coreGraph = graph as {
		nodes?: () => { style: (s: Record<string, unknown>) => void };
	};
	coreGraph?.nodes?.()?.style(style);
}

/**
 * Restore default opacity and colors for all graph elements.
 *
 * @param graph - Graph instance
 */
export function resetHighlight(
	graph: GraphInstance | undefined | Record<string, unknown>,
): void {
	if (!graph) return;
	const graphObj = graph as {
		elements?: unknown;
		nodeColor?: (c: string) => void;
		linkColor?: (c: string) => void;
	};
	if (typeof graphObj.elements === "function") {
		applyElementsStyle(graphObj, { opacity: 1 });
		return;
	}
	graphObj.nodeColor?.("color");
	graphObj.linkColor?.("color");
}

/**
 * Center and zoom on a specific node.
 *
 * @param graph - Graph instance
 * @param focusId - Node id to focus on
 */
export function focusNode(
	graph: GraphInstance | undefined | Record<string, unknown>,
	focusId: string,
): void {
	if (!graph) return;

	const graphObj = graph as {
		animate?: (opts: unknown, props: unknown) => void;
		$id?: (id: string) => { length: number };
		cameraPosition?: (pos: unknown, lookAt: unknown, ms: number) => void;
		centerAt?: (x: number, y: number, ms: number) => void;
		zoom?: (val: number, ms: number) => void;
		graphData?: () => {
			nodes: Array<{ id: string; x?: number; y?: number; z?: number }>;
		};
	};

	// Cytoscape
	if (
		typeof graphObj.animate === "function" &&
		typeof graphObj.$id === "function"
	) {
		const node = graphObj.$id(focusId);
		if (node && node.length > 0) {
			graphObj.animate(
				{
					center: { eles: node },
					zoom: 1.5,
				},
				{ duration: 500 },
			);
		}
		return;
	}

	// Force Graph 3D
	if (typeof graphObj.cameraPosition === "function") {
		const data = graphObj.graphData?.();
		if (!data) return;
		const node = data.nodes.find((n) => n.id === focusId);
		if (node) {
			// Calculate a position slightly offset from the node for a good view
			const distance = 100;
			const distRatio =
				1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
			const newPos =
				node.x || node.y || node.z
					? {
							x: (node.x || 0) * distRatio,
							y: (node.y || 0) * distRatio,
							z: (node.z || 0) * distRatio,
						}
					: { x: 0, y: 0, z: distance };
			graphObj.cameraPosition(newPos, node, 1000);
		}
		return;
	}

	// Force Graph 2D
	if (
		typeof graphObj.centerAt === "function" &&
		typeof graphObj.zoom === "function"
	) {
		const data = graphObj.graphData?.();
		if (!data) return;
		const node = data.nodes.find((n) => n.id === focusId);
		if (node) {
			graphObj.centerAt(node.x || 0, node.y || 0, 1000);
			graphObj.zoom(2, 1000);
		}
	}
}
