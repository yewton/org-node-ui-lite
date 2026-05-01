import { useCallback } from "react";
import { DetailsPanel } from "./components/DetailsPanel.tsx";
import { GraphContainer } from "./components/GraphContainer.tsx";
import { GraphControls } from "./components/GraphControls.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";
import { GlobalStyles } from "./components/ui/GlobalStyles.tsx";
import type { Layout, Renderer, Theme } from "./graph/graph-types.ts";
import { Layouts, Renderers, Themes } from "./graph/graph-types.ts";
import { useDetailsPanel } from "./hooks/useDetailsPanel.ts";
import { useEmacsSync } from "./hooks/useEmacsSync.ts";
import { useGraphManager } from "./hooks/useGraphManager.ts";
import { useUiDispatch, useUiState } from "./store/hooks.ts";

function App() {
	const state = useUiState();
	const dispatch = useUiDispatch();
	const {
		theme,
		renderer,
		layout,
		nodeSize,
		labelScale,
		showLabels,
		chargeStrength,
		followEmacs,
		settingsOpen,
		detailsOpen,
		selected,
	} = state;

	const {
		graphRef,
		openNodeAction,
		highlightNode,
		resetNodeHighlight,
		setTheme,
		setRenderer,
		setLayout,
		setNodeSize,
		setLabelScale,
		setShowLabels,
		setChargeStrength,
	} = useGraphManager({
		theme,
		renderer,
		layout,
		nodeSize,
		labelScale,
		showLabels,
		chargeStrength,
	});

	useEmacsSync(openNodeAction, followEmacs);

	// Expose openNodeAction for the screenshot test suite (dev builds only).
	if (import.meta.env.DEV) {
		Object.assign(window, { __openNode: openNodeAction });
	}

	const { closeDetails, toggleDetails } = useDetailsPanel({
		detailsOpen,
		resetNodeHighlight,
		highlightNode,
		selectedId: selected.id,
	});

	const handleThemeChange = useCallback(
		(t: Theme) => {
			setTheme(t);
			dispatch({ type: "SET_STATE", payload: { theme: t } });
		},
		[setTheme, dispatch],
	);

	const handleRendererChange = useCallback(
		(r: Renderer) => {
			void setRenderer(r);
			dispatch({ type: "SET_STATE", payload: { renderer: r } });
		},
		[setRenderer, dispatch],
	);

	const handleLayoutChange = useCallback(
		(l: Layout) => {
			void setLayout(l);
			dispatch({ type: "SET_STATE", payload: { layout: l } });
		},
		[setLayout, dispatch],
	);

	const handleNodeSizeChange = useCallback(
		(s: number) => {
			void setNodeSize(s);
			dispatch({ type: "SET_STATE", payload: { nodeSize: s } });
		},
		[setNodeSize, dispatch],
	);

	const handleLabelScaleChange = useCallback(
		(s: number) => {
			void setLabelScale(s);
			dispatch({ type: "SET_STATE", payload: { labelScale: s } });
		},
		[setLabelScale, dispatch],
	);

	const handleShowLabelsChange = useCallback(
		(s: boolean) => {
			void setShowLabels(s);
			dispatch({ type: "SET_STATE", payload: { showLabels: s } });
		},
		[setShowLabels, dispatch],
	);

	const handleChargeStrengthChange = useCallback(
		(s: number) => {
			void setChargeStrength(s);
			dispatch({ type: "SET_STATE", payload: { chargeStrength: s } });
		},
		[setChargeStrength, dispatch],
	);

	const handleFollowEmacsChange = useCallback(
		(follow: boolean) => {
			dispatch({ type: "SET_STATE", payload: { followEmacs: follow } });
		},
		[dispatch],
	);

	return (
		<div className="vh-100 vw-100">
			<GlobalStyles />
			<GraphContainer graphRef={graphRef} />

			<SettingsPanel
				open={settingsOpen}
				themes={Themes}
				renderers={Renderers}
				layouts={Layouts}
				theme={theme}
				renderer={renderer}
				layout={layout}
				nodeSize={nodeSize}
				labelScale={labelScale}
				showLabels={showLabels}
				chargeStrength={chargeStrength}
				followEmacs={followEmacs}
				onThemeChange={handleThemeChange}
				onRendererChange={handleRendererChange}
				onLayoutChange={handleLayoutChange}
				onNodeSizeChange={handleNodeSizeChange}
				onLabelScaleChange={handleLabelScaleChange}
				onShowLabelsChange={handleShowLabelsChange}
				onChargeStrengthChange={handleChargeStrengthChange}
				onFollowEmacsChange={handleFollowEmacsChange}
				onClose={() => dispatch({ type: "TOGGLE_SETTINGS" })}
			/>

			<GraphControls
				onToggleSettings={() => dispatch({ type: "TOGGLE_SETTINGS" })}
				onToggleDetails={toggleDetails}
			/>

			<DetailsPanel
				theme={theme}
				selected={selected}
				open={detailsOpen}
				onClose={closeDetails}
				onOpenNode={openNodeAction}
			/>
		</div>
	);
}

export default App;
