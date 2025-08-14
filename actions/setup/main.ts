import type * as actionsCore from "@actions/core";
import type { context, getOctokit } from "@actions/github";
import type { PushEvent } from "@octokit/webhooks-types";
import { readFile } from "fs/promises";
import path from "path";
import { parse } from "yaml";

export async function run({
	octokit,
	payload,
	ctx,
	core,
}: {
	octokit: ReturnType<typeof getOctokit>;
	payload: PushEvent;
	ctx: typeof context;
	core: typeof actionsCore;
}): Promise<void> {
	const { labels: desiredLables } = parse(
		await readFile(
			path.join(process.env.GITHUB_WORKSPACE ?? "", ".github/labels.yaml"),
			"utf8",
		),
	);
	const { data: currentLabels } = await octokit.rest.issues.listLabelsForRepo({
		owner: payload.repository.owner.login,
		repo: payload.repository.name,
	});

	// create missing labels
	for (const label of desiredLables) {
		if (!currentLabels.find((l) => l.name === label.name)) {
			await octokit.rest.issues.createLabel({
				owner: payload.repository.owner.login,
				repo: payload.repository.name,
				name: label.name,
				color: label.color,
				description: label.description,
			});
			core.info(`Created label: ${label.name}`);
		}
	}
}
