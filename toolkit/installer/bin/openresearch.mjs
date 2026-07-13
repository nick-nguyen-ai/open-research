#!/usr/bin/env node
// OpenResearch toolkit installer. Pure Node, zero dependencies.
// init / update / doctor, with --dry-run printing the exact command plan.
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, delimiter as PATH_DELIMITER } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Windows resolves executables via these extensions; "" covers POSIX.
const EXECUTABLE_EXTS = ["", ".exe", ".cmd", ".bat"];

export function parseArgs(argv) {
  const out = { command: null, dryRun: false, version: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--version") out.version = argv[++i] ?? null;
    else if (!out.command) out.command = a;
  }
  return out;
}

export function findRepoRoot(startDir, exists = existsSync) {
  let dir = startDir;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (exists(join(dir, "platform.config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("openresearch: platform.config.json not found — run inside an OpenResearch checkout.");
    }
    dir = parent;
  }
}

export function loadPlatformConfig(repoRoot, read = (p) => readFileSync(p, "utf8")) {
  return JSON.parse(read(join(repoRoot, "platform.config.json")));
}

export function pluginJsonPath(repoRoot) {
  return join(repoRoot, "toolkit", "plugins", "openresearch", ".claude-plugin", "plugin.json");
}

export function resolveSource(platform, repoRoot) {
  if (platform.repo) return `https://${platform.host}/${platform.repo}`;
  return join(repoRoot, "toolkit"); // no-remote: install from the local marketplace directory
}

export function planInit(source) {
  return [
    ["claude", "plugin", "marketplace", "add", source],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ];
}

export function planUpdate(source, { version = null, pluginVersion } = {}) {
  if (version && version !== pluginVersion) {
    throw new Error(`openresearch update: --version ${version} does not match plugin.json version ${pluginVersion}`);
  }
  return [
    ["claude", "plugin", "marketplace", "update", "openresearch"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ];
}

export function which(bin, {
  path = process.env.PATH ?? "",
  exists = existsSync,
  delimiter = PATH_DELIMITER,
  exts = EXECUTABLE_EXTS
} = {}) {
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (exists(join(dir, bin + ext))) return true;
    }
  }
  return false;
}

export function doctor({
  nodeVersion = process.versions.node,
  path = process.env.PATH ?? "",
  exists = existsSync,
  repoRoot = null
} = {}) {
  const checks = [];
  const major = Number(nodeVersion.split(".")[0]);
  checks.push({ name: "node >= 20", status: major >= 20 ? "ok" : "fail", detail: `found ${nodeVersion}` });

  const claude = which("claude", { path, exists });
  checks.push({
    name: "claude CLI",
    status: claude ? "ok" : "warn",
    detail: claude ? "found on PATH" : "not on PATH — use the manual marketplace-add commands"
  });

  const gh = which("gh", { path, exists });
  checks.push({
    name: "gh CLI",
    status: gh ? "ok" : "warn",
    detail: gh ? "found (auth not checked here — publish warns if unauthenticated)" : "not on PATH — publish uses the no-remote fallback"
  });

  const validatorPresent = repoRoot
    ? exists(join(repoRoot, "content", "validator", "bin", "validate.js"))
    : false;
  checks.push({
    name: "validator",
    status: validatorPresent ? "ok" : "warn",
    detail: validatorPresent ? "content/validator present — npm run validate available" : "run from the repo root to enable validation"
  });

  checks.push({
    name: "bedrock (probe stub)",
    status: "warn",
    detail: "not probed — real Bedrock verification is CBA-port work"
  });

  return checks;
}

function runPlan(plan, dryRun) {
  for (const args of plan) {
    if (dryRun) {
      console.log(`[dry-run] ${args.join(" ")}`);
      continue;
    }
    const r = spawnSync(args[0], args.slice(1), { stdio: "inherit" });
    if (r.error || r.status !== 0) {
      throw new Error(`openresearch: command failed — ${args.join(" ")}`);
    }
  }
  return plan;
}

export function main(argv, env = process.env) {
  const { command, dryRun, version } = parseArgs(argv);
  const repoRoot = findRepoRoot(process.cwd());
  const platform = loadPlatformConfig(repoRoot);
  const source = resolveSource(platform, repoRoot);

  if (command === "init") {
    if (!which("claude", { path: env.OPENRESEARCH_PATH_OVERRIDE ?? env.PATH ?? "" })) {
      console.log("claude CLI not found — run these manually once it is installed:");
    }
    return runPlan(planInit(source), dryRun);
  }
  if (command === "update") {
    const plugin = JSON.parse(readFileSync(pluginJsonPath(repoRoot), "utf8"));
    return runPlan(planUpdate(source, { version, pluginVersion: plugin.version }), dryRun);
  }
  if (command === "doctor") {
    const checks = doctor({ path: env.OPENRESEARCH_PATH_OVERRIDE ?? env.PATH ?? "", repoRoot });
    for (const c of checks) console.log(`[${c.status}] ${c.name} — ${c.detail}`);
    if (checks.some((c) => c.status === "fail")) process.exitCode = 1;
    return checks;
  }
  throw new Error(`openresearch: unknown command "${command ?? ""}". Use: init | update | doctor  [--dry-run] [--version <semver>]`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
