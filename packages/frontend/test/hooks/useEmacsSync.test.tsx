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

	it("calls onNodeChange when Emacs reports a new node ID", async () => {
		mockGet.mockResolvedValue({ data: { id: "node-abc" } });
		const onNodeChange = vi.fn();

		renderHook(() => useEmacsSync(onNodeChange));
		await flushInitialPoll();

		expect(onNodeChange).toHaveBeenCalledWith("node-abc");
	});

	it("does not call onNodeChange when the node ID is null", async () => {
		mockGet.mockResolvedValue({ data: { id: null } });
		const onNodeChange = vi.fn();

		renderHook(() => useEmacsSync(onNodeChange));
		await flushInitialPoll();

		expect(onNodeChange).not.toHaveBeenCalled();
	});

	it("does not call onNodeChange again when the same ID is returned", async () => {
		mockGet.mockResolvedValue({ data: { id: "same-id" } });
		const onNodeChange = vi.fn();

		renderHook(() => useEmacsSync(onNodeChange));
		await flushInitialPoll();
		await advanceInterval();

		expect(onNodeChange).toHaveBeenCalledTimes(1);
	});

	it("calls onNodeChange again when the ID changes", async () => {
		mockGet
			.mockResolvedValueOnce({ data: { id: "first-id" } })
			.mockResolvedValueOnce({ data: { id: "second-id" } });
		const onNodeChange = vi.fn();

		renderHook(() => useEmacsSync(onNodeChange));
		await flushInitialPoll();
		await advanceInterval();

		expect(onNodeChange).toHaveBeenCalledTimes(2);
		expect(onNodeChange).toHaveBeenNthCalledWith(1, "first-id");
		expect(onNodeChange).toHaveBeenNthCalledWith(2, "second-id");
	});

	it("ignores network errors silently", async () => {
		mockGet.mockRejectedValue(new Error("Network error"));
		const onNodeChange = vi.fn();

		renderHook(() => useEmacsSync(onNodeChange));
		await flushInitialPoll();

		expect(onNodeChange).not.toHaveBeenCalled();
	});
});
