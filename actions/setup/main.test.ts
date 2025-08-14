import { readFile } from "fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { run } from "./main.ts";

// Mock the file system and yaml modules
vi.mock("fs/promises");
vi.mock("yaml");

describe("setup action run function", () => {
	let coreMock: any;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Create a fresh mock for @actions/core
		coreMock = {
			info: vi.fn(),
			setFailed: vi.fn(),
			setOutput: vi.fn(),
		};

		// Save original env and set GITHUB_WORKSPACE
		originalEnv = process.env;
		process.env = { ...originalEnv, GITHUB_WORKSPACE: "/workspace" };

		// Reset all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore original env
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	const createMockOctokit = (currentLabels: any[] = []) => {
		return {
			rest: {
				issues: {
					listLabelsForRepo: vi.fn().mockResolvedValue({
						data: currentLabels,
					}),
					createLabel: vi.fn().mockResolvedValue({}),
				},
			},
		};
	};

	const createMockPayload = (repo = "test-repo", owner = "test-owner") => {
		return {
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

	it("should create missing labels", async () => {
		const desiredLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
			{
				name: "enhancement",
				color: "a2eeef",
				description: "New feature or request",
			},
			{
				name: "documentation",
				color: "0075ca",
				description: "Improvements or additions to documentation",
			},
		];

		const currentLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
		];

		// Mock file reading and parsing
		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: d73a4a",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit(currentLabels);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Verify file was read from correct path
		expect(readFile).toHaveBeenCalledWith(
			"/workspace/.github/labels.yaml",
			"utf8",
		);

		// Verify labels were listed
		expect(mockOctokit.rest.issues.listLabelsForRepo).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
		});

		// Verify only missing labels were created
		expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledTimes(2);
		expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
			name: "enhancement",
			color: "a2eeef",
			description: "New feature or request",
		});
		expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
			name: "documentation",
			color: "0075ca",
			description: "Improvements or additions to documentation",
		});

		// Verify info logs
		expect(coreMock.info).toHaveBeenCalledWith("Created label: enhancement");
		expect(coreMock.info).toHaveBeenCalledWith("Created label: documentation");
		expect(coreMock.info).not.toHaveBeenCalledWith("Created label: bug");
	});

	it("should not create any labels if all exist", async () => {
		const desiredLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
			{
				name: "enhancement",
				color: "a2eeef",
				description: "New feature or request",
			},
		];

		// All labels already exist
		const currentLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
			{
				name: "enhancement",
				color: "a2eeef",
				description: "New feature or request",
			},
		];

		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: d73a4a",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit(currentLabels);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Verify no labels were created
		expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
		expect(coreMock.info).not.toHaveBeenCalled();
	});

	it("should create all labels when repository has none", async () => {
		const desiredLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
			{
				name: "enhancement",
				color: "a2eeef",
				description: "New feature or request",
			},
			{
				name: "documentation",
				color: "0075ca",
				description: "Improvements or additions to documentation",
			},
		];

		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: d73a4a",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit([]); // No existing labels
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Verify all labels were created
		expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledTimes(3);
		desiredLabels.forEach((label) => {
			expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
				owner: "test-owner",
				repo: "test-repo",
				name: label.name,
				color: label.color,
				description: label.description,
			});
			expect(coreMock.info).toHaveBeenCalledWith(
				`Created label: ${label.name}`,
			);
		});
	});

	it("should handle file reading errors", async () => {
		vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

		const mockOctokit = createMockOctokit();
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await expect(
			run({
				octokit: mockOctokit as any,
				payload: mockPayload as any,
				ctx: mockContext as any,
				core: coreMock,
			}),
		).rejects.toThrow("File not found");

		// Verify no API calls were made
		expect(mockOctokit.rest.issues.listLabelsForRepo).not.toHaveBeenCalled();
		expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
	});

	it("should handle YAML parsing errors", async () => {
		vi.mocked(readFile).mockResolvedValue("invalid: yaml: content:");
		vi.mocked(parse).mockImplementation(() => {
			throw new Error("Invalid YAML");
		});

		const mockOctokit = createMockOctokit();
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await expect(
			run({
				octokit: mockOctokit as any,
				payload: mockPayload as any,
				ctx: mockContext as any,
				core: coreMock,
			}),
		).rejects.toThrow("Invalid YAML");

		// Verify no API calls were made
		expect(mockOctokit.rest.issues.listLabelsForRepo).not.toHaveBeenCalled();
		expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
	});

	it("should handle API errors when listing labels", async () => {
		const desiredLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
		];

		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: d73a4a",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit();
		mockOctokit.rest.issues.listLabelsForRepo = vi
			.fn()
			.mockRejectedValue(new Error("API rate limit exceeded"));

		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await expect(
			run({
				octokit: mockOctokit as any,
				payload: mockPayload as any,
				ctx: mockContext as any,
				core: coreMock,
			}),
		).rejects.toThrow("API rate limit exceeded");

		// Verify no labels were created
		expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
	});

	it("should handle API errors when creating labels", async () => {
		const desiredLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
		];

		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: d73a4a",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit([]); // No existing labels
		mockOctokit.rest.issues.createLabel = vi
			.fn()
			.mockRejectedValue(new Error("Permission denied"));

		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await expect(
			run({
				octokit: mockOctokit as any,
				payload: mockPayload as any,
				ctx: mockContext as any,
				core: coreMock,
			}),
		).rejects.toThrow("Permission denied");
	});

	it("should use empty workspace path when GITHUB_WORKSPACE is not set", async () => {
		// Remove GITHUB_WORKSPACE
		delete process.env.GITHUB_WORKSPACE;

		const desiredLabels = [
			{ name: "bug", color: "d73a4a", description: "Something isn't working" },
		];

		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: d73a4a",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit([]);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Verify file was read from root path
		expect(readFile).toHaveBeenCalledWith(".github/labels.yaml", "utf8");
	});

	it("should handle labels with matching names but different properties", async () => {
		const desiredLabels = [
			{ name: "bug", color: "ff0000", description: "Updated description" },
			{ name: "enhancement", color: "00ff00", description: "New feature" },
		];

		const currentLabels = [
			{ name: "bug", color: "d73a4a", description: "Old description" },
		];

		vi.mocked(readFile).mockResolvedValue(
			"labels:\n  - name: bug\n    color: ff0000",
		);
		vi.mocked(parse).mockReturnValue({ labels: desiredLabels });

		const mockOctokit = createMockOctokit(currentLabels);
		const mockPayload = createMockPayload();
		const mockContext = createMockContext();

		await run({
			octokit: mockOctokit as any,
			payload: mockPayload as any,
			ctx: mockContext as any,
			core: coreMock,
		});

		// Verify only new label was created (not updating existing ones)
		expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledTimes(1);
		expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
			owner: "test-owner",
			repo: "test-repo",
			name: "enhancement",
			color: "00ff00",
			description: "New feature",
		});
		expect(coreMock.info).toHaveBeenCalledWith("Created label: enhancement");
		expect(coreMock.info).not.toHaveBeenCalledWith("Created label: bug");
	});
});
