#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  compareSemver,
  latestOpenSeTag,
  parseSemver,
} from "./release-version.mjs";

const srcRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(srcRoot);
process.chdir(root);

const args = new Set(process.argv.slice(2));
if (args.has("--help")) {
  console.log("Usage: pnpm --dir src release:images [--dry-run]");
  console.log(
    "Tags main, publishes versioned GHCR images, and creates a GitHub Release.",
  );
  process.exit(0);
}
for (const arg of args) {
  if (arg !== "--dry-run") fail(`Unknown option: ${arg}`);
}

const packageJson = JSON.parse(
  await readFile(join(srcRoot, "package.json"), "utf8"),
);
const version = packageJson.version;
if (typeof version !== "string" || !parseSemver(version)) {
  fail("src/package.json must contain a valid semantic version.");
}

const tag = `opense-v${version}`;
if (args.has("--dry-run")) {
  console.log(`OpenSe release dry run for ${tag}`);
  console.log(
    "No commands will be executed and nothing will be tagged, pushed, built, or published.",
  );
  console.log(
    "Actual flow: preflight -> local Docker build -> tag -> push tag -> GitHub Actions image build -> GitHub Release",
  );
  process.exit(0);
}

requireCommand("git", ["--version"], "Install Git before creating a release.");
requireCommand(
  "pnpm",
  ["--version"],
  "Install pnpm before creating a release.",
);
requireCommand(
  "gh",
  ["--version"],
  "Install GitHub CLI with `brew install gh`, then run `gh auth login`.",
);
run(
  "gh",
  ["auth", "status"],
  "Authenticate GitHub CLI first with `gh auth login`.",
);

if (capture("git", ["branch", "--show-current"]) !== "main") {
  fail("Releases must be created from the main branch.");
}
if (capture("git", ["status", "--porcelain"])) {
  fail("Commit or discard all working-tree changes before releasing.");
}

run(
  "git",
  ["fetch", "origin", "main", "--tags"],
  "Unable to refresh origin/main and release tags.",
);
if (
  capture("git", ["rev-parse", "HEAD"]) !==
  capture("git", ["rev-parse", "origin/main"])
) {
  fail(
    "Local main must exactly match origin/main. Push or pull before releasing.",
  );
}

const latestTag = latestOpenSeTag(
  capture("git", ["tag", "--list", "opense-v*"]).split("\n"),
);
if (
  latestTag &&
  compareSemver(version, latestTag.slice("opense-v".length)) <= 0
) {
  fail(
    `Version ${version} must be greater than the latest OpenSe release ${latestTag}. Bump src/package.json first.`,
  );
}
if (succeeds("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`])) {
  fail(
    `Tag ${tag} already exists. Bump src/package.json before releasing again.`,
  );
}
if (succeeds("gh", ["release", "view", tag])) {
  fail(
    `GitHub Release ${tag} already exists. Bump src/package.json before releasing again.`,
  );
}

console.log(`Building OpenSe ${version} Docker images locally...`);
run(
  "pnpm",
  ["--dir", "src", "docker:build"],
  "Local production Docker build failed. No release was started.",
);

run(
  "git",
  ["tag", "-a", tag, "-m", `OpenSe ${version}`],
  `Unable to create tag ${tag}.`,
);
const push = spawnSync(
  "git",
  ["push", "origin", `refs/tags/${tag}:refs/tags/${tag}`],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (push.error || push.status !== 0) {
  spawnSync("git", ["tag", "-d", tag], { cwd: root, stdio: "ignore" });
  fail(
    "Tag push failed. The temporary local tag was removed and no release was started.",
  );
}

console.log(`Starting the image release workflow for ${tag}...`);
const dispatch = spawnSync(
  "gh",
  [
    "workflow",
    "run",
    "publish-ghcr.yml",
    "--ref",
    tag,
    "-f",
    `version=${version}`,
  ],
  { cwd: root, stdio: "inherit" },
);
if (dispatch.error || dispatch.status !== 0) {
  fail(
    `The tag was pushed, but the workflow did not start. Retry with: gh workflow run publish-ghcr.yml --ref ${tag} -f version=${version}`,
  );
}

const commit = capture("git", ["rev-parse", "HEAD"]);
const runId = await findWorkflowRun(commit, tag);
if (!runId) {
  fail(
    `The workflow was dispatched but its run could not be found. Check: gh run list --workflow publish-ghcr.yml --commit ${commit}`,
  );
}

console.log(`Watching GitHub Actions run ${runId}...`);
run(
  "gh",
  ["run", "watch", runId, "--exit-status"],
  `Release workflow ${runId} failed.`,
);
console.log(`Published OpenSe ${version}.`);

async function findWorkflowRun(commit, tag) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync(
      "gh",
      [
        "run",
        "list",
        "--workflow",
        "publish-ghcr.yml",
        "--event",
        "workflow_dispatch",
        "--branch",
        tag,
        "--commit",
        commit,
        "--limit",
        "1",
        "--json",
        "databaseId",
        "--jq",
        ".[0].databaseId // empty",
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (!result.error && result.status === 0 && result.stdout.trim())
      return result.stdout.trim();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null;
}

function capture(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0)
    fail(`Command failed: ${command} ${commandArgs.join(" ")}`);
  return result.stdout.trim();
}

function succeeds(command, commandArgs) {
  return (
    spawnSync(command, commandArgs, { cwd: root, stdio: "ignore" }).status === 0
  );
}

function requireCommand(command, commandArgs, message) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "ignore",
  });
  if (result.error || result.status !== 0) fail(message);
}

function run(command, commandArgs, message) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) fail(message);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
