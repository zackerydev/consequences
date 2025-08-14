import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "./main.ts";

describe("size action run function", () => {
	let processExitMock: any;
	let coreMock: any;

	beforeEach(() => {
		// Create a fresh mock for @actions/core
		coreMock = {
			info: vi.fn(),
			setFailed: vi.fn(),
			setOutput: vi.fn(),
		};
		processExitMock = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const createMockOctokit = (files: any[], labels: any[] = []) => {
		return {
			rest: {
				pulls: {
					listFiles: vi.fn().mockResolvedValue({
						data: files,
					}),
				},
				issues: {
					listLabelsOnIssue: vi.fn().mockResolvedValue({
						data: labels,
					}),
					removeLabel: vi.fn().mockResolvedValue({}),
					addLabels: vi.fn().mockResolvedValue({}),
				},
			},
		};
	};

	const createMockPayload = (
		number = 1,
		repo = "test-repo",
		owner = "test-owner",
	) => {
		return {
			number,
			repository: {
				name: repo,
				owner: {
					login: owner,
				},
			},
		};
	};

	const createMockContext = () => {
		return {
			repo: {
				owner: "test-owner",
				repo: "test-repo",
			},
		};
	};

	it("should apply xs label for small changes", async () => {
		const mockFiles = [
			{ filename: "src/index.ts", changes: 5 },
			{ filename: "src/utils.ts", changes: 3 },
		];
		const mockOctokit = createMockOctokit(mockFiles);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Verify API calls
		expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledTimes(1);
		expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
			pull_number: 1,
		});

		// Verify label was applied
		expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledTimes(1);
		expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
			issue_number: 1,
			labels: ["size/xs"],
		});

		// Verify outputs
		expect(coreMock.setOutput).toHaveBeenCalledTimes(2);
		expect(coreMock.setOutput).toHaveBeenNthCalledWith(1, "size", "size/xs");
		expect(coreMock.setOutput).toHaveBeenNthCalledWith(2, "lines_changed", 8);
	});

	it("should apply correct labels for different sizes", async () => {
		const testCases = [
			{ changes: [5, 4], expectedLabel: "size/xs" }, // 9 lines
			{ changes: [10, 5], expectedLabel: "size/s" }, // 15 lines
			{ changes: [30, 20], expectedLabel: "size/m" }, // 50 lines
			{ changes: [200, 150], expectedLabel: "size/l" }, // 350 lines
			{ changes: [400, 300], expectedLabel: "size/xl" }, // 700 lines
			{ changes: [600, 500], expectedLabel: "size/xxl" }, // 1100 lines
		];

		for (const { changes, expectedLabel } of testCases) {
			// Reset mocks for each test case
			vi.clearAllMocks();

			const mockFiles = changes.map((change, i) => ({
				filename: `file${i}.ts`,
				changes: change,
			}));
			const mockOctokit = createMockOctokit(mockFiles);
			const mockPayload = createMockPayload();
			const mockContext = createMockContext();

			await run({
				octokit: mockOctokit as any,
				payload: mockPayload as any,
				ctx: mockContext as any,
				core: coreMock,
			});

			expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: [expectedLabel],
				}),
			);
		}
	});

	it("should ignore pnpm-lock.yaml in line count", async () => {
		const mockFiles = [
			{ filename: "src/index.ts", changes: 5 },
			{ filename: "pnpm-lock.yaml", changes: 1000 },
			{ filename: "src/utils.ts", changes: 3 },
		];
		const mockOctokit = createMockOctokit(mockFiles);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Should only count 8 lines (5 + 3), ignoring pnpm-lock.yaml
		expect(coreMock.setOutput).toHaveBeenNthCalledWith(2, "lines_changed", 8);
		expect(coreMock.setOutput).toHaveBeenNthCalledWith(1, "size", "size/xs");
	});

	it("should remove existing size labels before applying new one", async () => {
		const mockFiles = [{ filename: "src/index.ts", changes: 50 }];
		const existingLabels = [
			{ name: "size/xs" },
			{ name: "size/l" },
			{ name: "bug" },
			{ name: "enhancement" },
		];
		const mockOctokit = createMockOctokit(mockFiles, existingLabels);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Should remove both existing size labels
		expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledTimes(2);
		expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "size/xs" }),
		);
		expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ name: "size/l" }),
		);

		// Should apply new label
		expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledTimes(1);
		expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({
				labels: ["size/m"],
			}),
		);
	});

	it("should handle API errors gracefully", async () => {
		const mockFiles = [{ filename: "src/index.ts", changes: 10 }];
		const mockOctokit = createMockOctokit(mockFiles);

		// Make addLabels throw an error
		mockOctokit.rest.issues.addLabels = vi
			.fn()
			.mockRejectedValue(new Error("API rate limit exceeded"));

		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Should call setFailed and exit
		expect(coreMock.setFailed).toHaveBeenCalledTimes(1);
		expect(coreMock.setFailed).toHaveBeenCalledWith(
			expect.stringContaining("Failed to apply size label"),
		);
		expect(coreMock.setFailed).toHaveBeenCalledWith(
			expect.stringContaining("API rate limit exceeded"),
		);
		expect(processExitMock).toHaveBeenCalledTimes(1);
		expect(processExitMock).toHaveBeenCalledWith(1);
	});

	it("should handle empty file list", async () => {
		const mockOctokit = createMockOctokit([]);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Should apply xs label for 0 changes
		expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({
				labels: ["size/xs"],
			}),
		);
		expect(coreMock.setOutput).toHaveBeenNthCalledWith(2, "lines_changed", 0);
	});

	it("should log appropriate messages", async () => {
		const mockFiles = [{ filename: "src/index.ts", changes: 25 }];
		const existingLabels = [{ name: "size/xs" }];
		const mockOctokit = createMockOctokit(mockFiles, existingLabels);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Check info logs
		expect(coreMock.info).toHaveBeenCalledWith("Lines changed: 25");
		expect(coreMock.info).toHaveBeenCalledWith("Determined size label: size/s");
		expect(coreMock.info).toHaveBeenCalledWith("Removed label: size/xs");
		expect(coreMock.info).toHaveBeenCalledWith("Applied label: size/s");
	});
});
