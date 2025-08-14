import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { PushEvent } from "@octokit/webhooks-types";
import { run } from "./main.ts";

const { GITHUB_TOKEN } = process.env;

if (!GITHUB_TOKEN || GITHUB_TOKEN === "") {
	core.setFailed("Missing GITHUB_TOKEN");
	process.exit(1);
}

const octokit = getOctokit(GITHUB_TOKEN ?? "");
const payload = context.payload as PushEvent;

await run({
	octokit,
	payload,
	ctx: context,
	core,
});
