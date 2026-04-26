import createClient from "openapi-fetch";
import { useEffect, useRef } from "react";
import type { paths } from "../api/api.d.ts";

const api = createClient<paths>({ baseUrl: "/" });

/**
 * Poll /api/current-node.json every 2 s and call onNodeChange whenever Emacs
 * moves the cursor to a different org-node.  No-ops while the cursor is
 * outside an Org buffer or on a heading without an :ID: property.
 */
export function useEmacsSync(onNodeChange: (nodeId: string) => void): void {
	const callbackRef = useRef(onNodeChange);
	callbackRef.current = onNodeChange;

	const lastIdRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const poll = async () => {
			if (cancelled) return;
			try {
				const { data } = await api.GET("api/current-node.json");
				if (cancelled || !data) return;
				const id = data.id;
				if (id !== null && id !== lastIdRef.current) {
					lastIdRef.current = id;
					callbackRef.current(id);
				} else if (id === null) {
					lastIdRef.current = null;
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
