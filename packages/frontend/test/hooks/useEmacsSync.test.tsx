import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmacsSync } from "../../src/hooks/useEmacsSync.ts";

// vi.mock is hoisted before variable declarations, so use vi.hoisted() to
// ensure mockGet is initialized before the factory function runs.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("openapi-fetch", () => ({
	default: () => ({ GET: mockGet }),
}));

async function flushInitialPoll() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
}

async function advanceInterval() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(2000);
	});
}

describe("useEmacsSync", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("explicit selection (seq)", () => {
		it("selects the node when seq increments, regardless of followEnabled", async () => {
			mockGet.mockResolvedValue({ data: { id: "node-abc", seq: 1 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, false));
			await flushInitialPoll();

			expect(onNodeChange).toHaveBeenCalledWith("node-abc");
		});

		it("does not fire again if seq stays the same on next poll", async () => {
			mockGet.mockResolvedValue({ data: { id: "node-abc", seq: 1 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, false));
			await flushInitialPoll();
			await advanceInterval();

			expect(onNodeChange).toHaveBeenCalledTimes(1);
		});

		it("fires again when seq increments a second time", async () => {
			mockGet
				.mockResolvedValueOnce({ data: { id: "node-abc", seq: 1 } })
				.mockResolvedValueOnce({ data: { id: "node-abc", seq: 2 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, false));
			await flushInitialPoll();
			await advanceInterval();

			expect(onNodeChange).toHaveBeenCalledTimes(2);
		});

		it("does not fire when seq is 0 and follow is off", async () => {
			mockGet.mockResolvedValue({ data: { id: "node-abc", seq: 0 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, false));
			await flushInitialPoll();

			expect(onNodeChange).not.toHaveBeenCalled();
		});
	});

	describe("follow mode", () => {
		it("selects the node when follow is on and cursor moves to a new node", async () => {
			mockGet.mockResolvedValue({ data: { id: "node-xyz", seq: 0 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, true));
			await flushInitialPoll();

			expect(onNodeChange).toHaveBeenCalledWith("node-xyz");
		});

		it("does not fire for the same node ID on repeated polls", async () => {
			mockGet.mockResolvedValue({ data: { id: "same-id", seq: 0 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, true));
			await flushInitialPoll();
			await advanceInterval();

			expect(onNodeChange).toHaveBeenCalledTimes(1);
		});

		it("fires again when cursor moves to a different node", async () => {
			mockGet
				.mockResolvedValueOnce({ data: { id: "first-id", seq: 0 } })
				.mockResolvedValueOnce({ data: { id: "second-id", seq: 0 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, true));
			await flushInitialPoll();
			await advanceInterval();

			expect(onNodeChange).toHaveBeenCalledTimes(2);
			expect(onNodeChange).toHaveBeenNthCalledWith(1, "first-id");
			expect(onNodeChange).toHaveBeenNthCalledWith(2, "second-id");
		});

		it("does not fire when follow is off, even if cursor moves", async () => {
			mockGet
				.mockResolvedValueOnce({ data: { id: "first-id", seq: 0 } })
				.mockResolvedValueOnce({ data: { id: "second-id", seq: 0 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, false));
			await flushInitialPoll();
			await advanceInterval();

			expect(onNodeChange).not.toHaveBeenCalled();
		});

		it("does not fire when id is null", async () => {
			mockGet.mockResolvedValue({ data: { id: null, seq: 0 } });
			const onNodeChange = vi.fn();

			renderHook(() => useEmacsSync(onNodeChange, true));
			await flushInitialPoll();

			expect(onNodeChange).not.toHaveBeenCalled();
		});
	});

	it("ignores network errors silently", async () => {
		mockGet.mockRejectedValue(new Error("Network error"));
		const onNodeChange = vi.fn();

		renderHook(() => useEmacsSync(onNodeChange, false));
		await flushInitialPoll();

		expect(onNodeChange).not.toHaveBeenCalled();
	});
});
