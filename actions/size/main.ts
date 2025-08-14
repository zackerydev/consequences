import type * as actionsCore from "@actions/core";
import type { context, getOctokit } from "@actions/github";
import type { PullRequestEvent } from "@octokit/webhooks-types";

const IGNORE_FILES = ["pnpm-lock.yaml"];

// sizes: https://github.com/kubernetes/kubernetes/labels?q=size
const SIZES = {
	10: "xs",
	29: "s",
	99: "m",
	499: "l",
	999: "xl",
	Infinity: "xxl",
};

export async function run({
	octokit,
	payload,
	ctx,
	core,
}: {
	octokit: ReturnType<typeof getOctokit>;
	payload: PullRequestEvent;
	ctx: typeof context;
	core: typeof actionsCore;
}) {
	const files = await octokit.rest.pulls.listFiles({
		owner: payload.repository.owner.login,
		repo: payload.repository.name,
		pull_number: payload.number,
	});

	const linesChanged = files.data
		.filter((file) => !IGNORE_FILES.includes(file.filename))
		.reduce((acc, file) => {
			return acc + file.changes;
		}, 0);

	core.info(`Lines changed: ${linesChanged}`);

	// Determine the size label based on lines changed
	let sizeLabel = "size/xs";
	for (const [threshold, size] of Object.entries(SIZES)) {
		if (linesChanged < Number(threshold)) {
			sizeLabel = `size/${size}`;
			break;
		}
	}

	core.info(`Determined size label: ${sizeLabel}`);

	try {
		// Get existing labels on the PR
		const { data: currentLabels } = await octokit.rest.issues.listLabelsOnIssue(
			{
				owner: payload.repository.owner.login,
				repo: payload.repository.name,
				issue_number: payload.number,
			},
		);

		// Remove any existing size labels
		const sizeLabelsToRemove = currentLabels
			.filter((label) => label.name.startsWith("size/"))
			.map((label) => label.name);

		for (const label of sizeLabelsToRemove) {
			await octokit.rest.issues.removeLabel({
				owner: payload.repository.owner.login,
				repo: payload.repository.name,
				issue_number: payload.number,
				name: label,
			});
			core.info(`Removed label: ${label}`);
		}

		// Apply the new size label
		await octokit.rest.issues.addLabels({
			owner: payload.repository.owner.login,
			repo: payload.repository.name,
			issue_number: payload.number,
			labels: [sizeLabel],
		});

		core.info(`Applied label: ${sizeLabel}`);
		core.setOutput("size", sizeLabel);
		core.setOutput("lines_changed", linesChanged);
	} catch (error) {
		core.setFailed(`Failed to apply size label: ${error}`);
		process.exit(1);
	}
}
