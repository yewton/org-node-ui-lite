import createClient from "openapi-fetch";
import { useEffect, useRef } from "react";
import type { paths } from "../api/api.d.ts";

const api = createClient<paths>({ baseUrl: "/" });

/**
 * Poll /api/current-node.json every 2 s and call onNodeChange when either:
 * - An explicit selection is requested from Emacs (seq incremented), or
 * - followEnabled is true and the cursor moves to a different org-node.
 */
export function useEmacsSync(
	onNodeChange: (nodeId: string) => void,
	followEnabled: boolean,
): void {
	const callbackRef = useRef(onNodeChange);
	callbackRef.current = onNodeChange;

	const lastIdRef = useRef<string | null>(null);
	const lastSeqRef = useRef<number>(0);

	// followEnabled is read inside the effect callback; keep a ref so the
	// interval closure always sees the current value without re-subscribing.
	const followRef = useRef(followEnabled);
	followRef.current = followEnabled;

	useEffect(() => {
		let cancelled = false;

		const poll = async () => {
			if (cancelled) return;
			try {
				const { data } = await api.GET("api/current-node.json");
				if (cancelled || !data) return;

				const { id, seq } = data;
				const seqFired = seq > lastSeqRef.current;
				const idChanged = id !== lastIdRef.current;

				if (seqFired) lastSeqRef.current = seq;
				lastIdRef.current = id;

				if (id !== null && (seqFired || (followRef.current && idChanged))) {
					callbackRef.current(id);
				}
			} catch {
				// Emacs server not reachable — ignore silently
			}
		};

		void poll();
		const interval = setInterval(() => void poll(), 2000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);
}
