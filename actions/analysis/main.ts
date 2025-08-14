import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

const { GITHUB_TOKEN } = process.env;
const { exit } = process;

if (!GITHUB_TOKEN || GITHUB_TOKEN === "") {
	core.setFailed("Missing GITHUB_TOKEN");
	exit(1);
}

const octokit = getOctokit(GITHUB_TOKEN ?? "");

const { payload } = context;

console.log(payload);
