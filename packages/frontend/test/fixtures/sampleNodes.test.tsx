import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DetailsPanel } from "../../src/components/DetailsPanel.tsx";
import {
	SAMPLE_EDGES,
	SAMPLE_GRAPH,
	SAMPLE_NODE_IDS,
	SAMPLE_NODE_SUMMARIES,
	SAMPLE_NODES,
} from "./sampleNodes.ts";

// ── Mocks for DetailsPanel tests ──────────────────────────────────────────────

vi.mock("../../src/graph/node.ts", () => ({
	openNode: vi.fn(),
}));

vi.mock("../../src/components/PreviewPopover.tsx", () => ({
	PreviewPopover: vi.fn(({ content }: { content: ReactNode }) => (
		<div data-testid="preview-popover">{content}</div>
	)),
}));

// ── Mocks for graph module tests ──────────────────────────────────────────────

const mockGET = vi.fn();
vi.mock("openapi-fetch", () => ({
	default: vi.fn(() => ({ GET: mockGET })),
}));

vi.mock("../../src/utils/style.ts", () => ({
	getCssVariable: vi.fn(() => "#cccccc"),
	pickColor: vi.fn((id: string) => `#color-${id}`),
	resolveAccentColors: vi.fn(() => ["#cccccc"]),
}));

const mockForceGraphRenderer = vi.fn();
vi.mock("../../src/graph/renderers/force-graph.ts", () => ({
	default: mockForceGraphRenderer,
}));
vi.mock("../../src/graph/renderers/cytoscape.ts", () => ({
	default: vi.fn().mockResolvedValue({ type: "cytoscape" }),
}));
vi.mock("../../src/graph/renderers/force-graph-3d.ts", () => ({
	default: vi.fn().mockResolvedValue({ type: "3d-force-graph" }),
}));

// ── Fixture integrity tests ───────────────────────────────────────────────────

describe("Sample data integrity", () => {
	it("contains exactly 30 node summaries", () => {
		expect(SAMPLE_NODE_SUMMARIES).toHaveLength(30);
	});

	it("contains exactly 31 edges", () => {
		expect(SAMPLE_EDGES).toHaveLength(31);
	});

	it("all node summaries have non-empty id and title", () => {
		for (const node of SAMPLE_NODE_SUMMARIES) {
			expect(typeof node.id).toBe("string");
			expect(node.id.length).toBeGreaterThan(0);
			expect(typeof node.title).toBe("string");
			expect(node.title.length).toBeGreaterThan(0);
		}
	});

	it("all node IDs are unique", () => {
		const ids = SAMPLE_NODE_SUMMARIES.map((n) => n.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("SAMPLE_NODE_IDS lists all 30 IDs", () => {
		expect(SAMPLE_NODE_IDS).toHaveLength(30);
		for (const { id } of SAMPLE_NODE_SUMMARIES) {
			expect(SAMPLE_NODE_IDS).toContain(id);
		}
	});

	it("all edge sources and destinations reference valid node IDs", () => {
		const nodeIds = new Set(SAMPLE_NODE_SUMMARIES.map((n) => n.id));
		for (const edge of SAMPLE_EDGES) {
			expect(
				nodeIds.has(edge.source),
				`Unknown source node: ${edge.source}`,
			).toBe(true);
			expect(
				nodeIds.has(edge.dest),
				`Unknown destination node: ${edge.dest}`,
			).toBe(true);
		}
	});

	it("SAMPLE_NODES provides detailed records for all 30 node IDs", () => {
		const detailIds = new Set(Object.keys(SAMPLE_NODES));
		for (const { id } of SAMPLE_NODE_SUMMARIES) {
			expect(detailIds.has(id), `Missing detailed node: ${id}`).toBe(true);
		}
	});

	it("all detailed nodes have non-empty id, title, and raw content", () => {
		for (const [id, node] of Object.entries(SAMPLE_NODES)) {
			expect(node.id).toBe(id);
			expect(node.title.length).toBeGreaterThan(0);
			expect(node.raw.length).toBeGreaterThan(0);
		}
	});

	it("backlinks in SAMPLE_NODES are consistent with SAMPLE_EDGES", () => {
		// Build expected backlink sets from the edge list
		const expected: Record<string, Set<string>> = {};
		for (const edge of SAMPLE_EDGES) {
			if (!expected[edge.dest]) {
				expected[edge.dest] = new Set<string>();
			}
			// biome-ignore lint/style/noNonNullAssertion: assigned in the branch above
			expected[edge.dest]!.add(edge.source);
		}

		for (const [nodeId, node] of Object.entries(SAMPLE_NODES)) {
			const actual = new Set((node.backlinks ?? []).map((b) => b.source));
			expect(actual, `Backlink mismatch for ${nodeId}`).toEqual(
				expected[nodeId] ?? new Set(),
			);
		}
	});

	it("nodes with expected backlink counts are correct", () => {
		// prog-algorithms is pointed to by math-linear-algebra, hist-technology, proj-index
		expect(SAMPLE_NODES["prog-algorithms"]?.backlinks).toHaveLength(3);
		// phil-metaphysics is pointed to by math-topology and phil-epistemology
		expect(SAMPLE_NODES["phil-metaphysics"]?.backlinks).toHaveLength(2);
		// Leaf nodes with no incoming edges
		expect(SAMPLE_NODES["math-calculus"]?.backlinks ?? []).toHaveLength(0);
		expect(SAMPLE_NODES["sci-chemistry"]?.backlinks ?? []).toHaveLength(0);
		expect(SAMPLE_NODES["proj-daily-log"]?.backlinks ?? []).toHaveLength(0);
	});

	it("SAMPLE_GRAPH bundles the same node and edge arrays", () => {
		expect(SAMPLE_GRAPH.nodes).toBe(SAMPLE_NODE_SUMMARIES);
		expect(SAMPLE_GRAPH.edges).toBe(SAMPLE_EDGES);
	});

	it("covers all five topic categories", () => {
		const ids = SAMPLE_NODE_IDS;
		expect(ids.some((id) => id.startsWith("math-"))).toBe(true);
		expect(ids.some((id) => id.startsWith("prog-"))).toBe(true);
		expect(ids.some((id) => id.startsWith("sci-"))).toBe(true);
		expect(ids.some((id) => id.startsWith("phil-"))).toBe(true);
		expect(ids.some((id) => id.startsWith("hist-"))).toBe(true);
		expect(ids.some((id) => id.startsWith("proj-"))).toBe(true);
	});
});

// ── Graph module tests ────────────────────────────────────────────────────────

describe("Graph module with 30-node dataset", () => {
	let graphModule: typeof import("../../src/graph/graph.ts");

	beforeEach(async () => {
		vi.clearAllMocks();
		mockForceGraphRenderer.mockResolvedValue({ type: "force-graph" });
		mockGET.mockResolvedValue({ data: SAMPLE_GRAPH, error: undefined });
		graphModule = await import("../../src/graph/graph.ts");
	});

	it("passes all 30 nodes to the renderer", async () => {
		const container = document.createElement("div");
		await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		const nodesArg = mockForceGraphRenderer.mock.calls[0]?.[0] as unknown[];
		expect(nodesArg).toHaveLength(30);
	});

	it("transforms NodeSummary objects into GraphNode format", async () => {
		const container = document.createElement("div");
		await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		const nodesArg = mockForceGraphRenderer.mock.calls[0]?.[0] as Array<{
			id: string;
			label: string;
			color: string;
		}>;
		for (const node of nodesArg) {
			expect(typeof node.id).toBe("string");
			expect(typeof node.label).toBe("string");
			expect(typeof node.color).toBe("string");
		}
	});

	it("maps node titles to label field correctly", async () => {
		const container = document.createElement("div");
		await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		const nodesArg = mockForceGraphRenderer.mock.calls[0]?.[0] as Array<{
			id: string;
			label: string;
		}>;
		const byId = new Map(nodesArg.map((n) => [n.id, n.label]));

		expect(byId.get("prog-algorithms")).toBe("Algorithms");
		expect(byId.get("phil-mind")).toBe("Philosophy of Mind");
		expect(byId.get("proj-daily-log")).toBe("Daily Log");
		expect(byId.get("hist-technology")).toBe("History of Technology");
	});

	it("passes all 31 edges to the renderer", async () => {
		const container = document.createElement("div");
		await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		const edgesArg = mockForceGraphRenderer.mock.calls[0]?.[1] as unknown[];
		expect(edgesArg).toHaveLength(31);
	});

	it("converts edge dest field to target field", async () => {
		const container = document.createElement("div");
		await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		const edgesArg = mockForceGraphRenderer.mock.calls[0]?.[1] as Array<{
			source: string;
			target: string;
		}>;

		// math-linear-algebra → prog-algorithms
		const edge = edgesArg.find(
			(e) =>
				e.source === "math-linear-algebra" && e.target === "prog-algorithms",
		);
		expect(edge).toBeDefined();

		// proj-daily-log → proj-notes-method
		const logEdge = edgesArg.find(
			(e) => e.source === "proj-daily-log" && e.target === "proj-notes-method",
		);
		expect(logEdge).toBeDefined();
	});

	it("filters out edges referencing non-existent node IDs", async () => {
		const graphWithOrphans = {
			nodes: SAMPLE_GRAPH.nodes,
			edges: [
				...SAMPLE_GRAPH.edges,
				{ source: "ghost-node", dest: "prog-algorithms" },
				{ source: "prog-algorithms", dest: "phantom-node" },
			],
		};
		mockGET.mockResolvedValue({ data: graphWithOrphans, error: undefined });

		const container = document.createElement("div");
		await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		// Two orphan edges must be stripped; only 31 valid ones remain
		const edgesArg = mockForceGraphRenderer.mock.calls[0]?.[1] as unknown[];
		expect(edgesArg).toHaveLength(31);
	});

	it("returns the renderer instance", async () => {
		const container = document.createElement("div");
		const result = await graphModule.drawGraph(
			"force-graph",
			"cose",
			container,
			undefined,
			10,
			0.5,
			true,
			-120,
			30,
			0,
		);

		expect(result).toEqual({ type: "force-graph" });
	});
});

// ── DetailsPanel tests ────────────────────────────────────────────────────────

describe("DetailsPanel with sample nodes", () => {
	const mockOnClose = vi.fn();
	const mockOnOpenNode = vi.fn();

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders node title for a programming node", () => {
		const node = SAMPLE_NODES["prog-algorithms"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>content</div> }}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByText("Algorithms")).toBeInTheDocument();
	});

	it("shows Backlinks section for node with 3 backlinks (prog-algorithms)", () => {
		const node = SAMPLE_NODES["prog-algorithms"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>content</div> }}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByText("Backlinks")).toBeInTheDocument();
		expect(screen.getByText("Linear Algebra")).toBeInTheDocument();
		expect(screen.getByText("History of Technology")).toBeInTheDocument();
		expect(screen.getByText("Index")).toBeInTheDocument();
	});

	it("does NOT show Backlinks section for node with 0 backlinks (math-calculus)", () => {
		const node = SAMPLE_NODES["math-calculus"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>content</div> }}
				theme="light"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.queryByText("Backlinks")).not.toBeInTheDocument();
	});

	it("shows both backlinks for node with 2 backlinks (phil-metaphysics)", () => {
		const node = SAMPLE_NODES["phil-metaphysics"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>content</div> }}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByText("Backlinks")).toBeInTheDocument();
		expect(screen.getByText("Topology")).toBeInTheDocument();
		expect(screen.getByText("Epistemology")).toBeInTheDocument();
	});

	it("clicking a backlink calls onOpenNode with the source ID", () => {
		const node = SAMPLE_NODES["prog-algorithms"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>content</div> }}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		fireEvent.click(screen.getByText("Index"));
		expect(mockOnOpenNode).toHaveBeenCalledWith("proj-index");
	});

	it("clicking second backlink calls onOpenNode with correct source ID", () => {
		const node = SAMPLE_NODES["prog-algorithms"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>content</div> }}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		fireEvent.click(screen.getByText("Linear Algebra"));
		expect(mockOnOpenNode).toHaveBeenCalledWith("math-linear-algebra");
	});

	it("renders the hub node (proj-index) and its single backlink", () => {
		const node = SAMPLE_NODES["proj-index"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>Index body</div> }}
				theme="light"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByText("Index")).toBeInTheDocument();
		expect(screen.getByText("Notes Methodology")).toBeInTheDocument();
	});

	it("does not render the dialog when open=false", () => {
		const node = SAMPLE_NODES["sci-physics"];
		const { queryByRole } = render(
			<DetailsPanel
				open={false}
				selected={{ ...node, body: <div>Physics</div> }}
				theme="light"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("does NOT show Backlinks for proj-daily-log (0 backlinks)", () => {
		const node = SAMPLE_NODES["proj-daily-log"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>Log</div> }}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.queryByText("Backlinks")).not.toBeInTheDocument();
	});

	it("shows both backlinks for phil-mind (neuroscience + ethics)", () => {
		const node = SAMPLE_NODES["phil-mind"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>Mind content</div> }}
				theme="light"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByText("Neuroscience")).toBeInTheDocument();
		expect(screen.getByText("Ethics")).toBeInTheDocument();
	});

	it("shows both backlinks for sci-biology (statistics + chemistry)", () => {
		const node = SAMPLE_NODES["sci-biology"];
		render(
			<DetailsPanel
				open={true}
				selected={{ ...node, body: <div>Biology</div> }}
				theme="light"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByText("Statistics")).toBeInTheDocument();
		expect(screen.getByText("Chemistry")).toBeInTheDocument();
	});

	it("renders node body content", () => {
		const node = SAMPLE_NODES["math-topology"];
		render(
			<DetailsPanel
				open={true}
				selected={{
					...node,
					body: <div data-testid="body-content">Topology content</div>,
				}}
				theme="dark"
				onClose={mockOnClose}
				onOpenNode={mockOnOpenNode}
			/>,
		);
		expect(screen.getByTestId("body-content")).toHaveTextContent(
			"Topology content",
		);
	});
});
