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

export function resolveExecutable(bin, {
  path = process.env.PATH ?? "",
  exists = existsSync,
  delimiter = PATH_DELIMITER,
  exts = EXECUTABLE_EXTS
} = {}) {
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = join(dir, bin + ext);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

export function which(bin, opts = {}) {
  return resolveExecutable(bin, opts) !== null;
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

function runPlan(plan, dryRun, {
  log = console.log,
  path = process.env.PATH ?? "",
  exists = existsSync,
  spawn = spawnSync
} = {}) {
  for (const args of plan) {
    if (dryRun) {
      log(`[dry-run] ${args.join(" ")}`);
      continue;
    }
    // Windows: npm-installed CLIs are .cmd/.bat shims that spawnSync cannot
    // launch bare (ENOENT). Resolve the executable, and go through the shell
    // for shims — quoting each arg that contains whitespace.
    const resolved = resolveExecutable(args[0], { path, exists }) ?? args[0];
    const lower = resolved.toLowerCase();
    let r;
    if (lower.endsWith(".cmd") || lower.endsWith(".bat")) {
      const q = (a) => (/\s/.test(a) ? `"${a}"` : a);
      r = spawn(q(resolved), args.slice(1).map(q), { stdio: "inherit", shell: true });
    } else {
      r = spawn(resolved, args.slice(1), { stdio: "inherit" });
    }
    if (r.error || r.status !== 0) {
      throw new Error(`openresearch: command failed — ${args.join(" ")}`);
    }
  }
  return plan;
}

export function main(argv, env = process.env, {
  log = console.log,
  cwd = process.cwd(),
  exists = existsSync,
  read = (p) => readFileSync(p, "utf8"),
  spawn = spawnSync
} = {}) {
  const { command, dryRun, version } = parseArgs(argv);
  const repoRoot = findRepoRoot(cwd, exists);
  const platform = loadPlatformConfig(repoRoot, read);
  const source = resolveSource(platform, repoRoot);
  const path = env.OPENRESEARCH_PATH_OVERRIDE ?? env.PATH ?? "";

  if (command === "init" || command === "update") {
    let plan;
    if (command === "init") {
      plan = planInit(source);
    } else {
      const plugin = JSON.parse(read(pluginJsonPath(repoRoot)));
      plan = planUpdate(source, { version, pluginVersion: plugin.version });
    }
    if (!dryRun && !which("claude", { path, exists })) {
      // Manual-instructions path: print every command, spawn nothing, exit 0.
      log("claude CLI not found — run these manually once it is installed:");
      for (const args of plan) log(args.join(" "));
      return 0;
    }
    return runPlan(plan, dryRun, { log, path, exists, spawn });
  }
  if (command === "doctor") {
    const checks = doctor({ path, exists, repoRoot });
    for (const c of checks) log(`[${c.status}] ${c.name} — ${c.detail}`);
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
