// PreToolUse hook (wired in .claude/settings.json): stops an agent reading secrets, printing the
// environment, pushing to main or tags, deleting shared branches and worktrees, or changing the repo's
// rulesets, secrets and release workflows through gh. The deny-list there matches command prefixes; this catches
// the same things inside `a && b`, `$(...)`, `FOO=1 env`, `git -C dir push`, and Read/Grep paths.
// A speed bump, not a sandbox: a script the agent writes can still read a file. Exit 2 blocks the
// call and shows stderr to the agent.
import { homedir } from "node:os";
import { basename, resolve } from "node:path";

export type HookInput = { tool_name: string; tool_input: Record<string, unknown>; cwd?: string };
type BranchOf = (cwd: string) => string | null;

const MAIN = new Set(["main", "master"]);
const SAFE_ENV = new Set([".env.schema", ".env.example"]);
// Commands that print, copy, link, pack or upload a file they're given, and interpreters that would read one.
const READERS = new Set(["cat", "head", "tail", "less", "more", "bat", "grep", "rg", "egrep", "fgrep", "sed", "awk",
  "source", ".", "cp", "base64", "xxd", "od", "strings", "nl", "sort", "uniq", "cut", "jq", "diff", "tac", "open",
  "ln", "mv", "tar", "zip", "gzip", "rsync", "scp", "install", "curl", "wget", "tee", "xargs", "split",
  "bun", "node", "deno", "python", "python3", "ruby", "perl", "php", "sh", "bash", "zsh"]);
// Credential files outside the repo that every agent, running as you, could otherwise read: the gh login,
// npm and wrangler tokens, the agent CLIs' own logins, ssh and cloud keys.
const HOME_SECRETS = [/\/\.config\/gh\/hosts\.yml$/, /\/\.npmrc$/, /\/\.wrangler\/config\//, /\/\.codex\/auth\.json$/,
  /\/\.claude\/\.credentials\.json$/, /\/\.local\/share\/opencode\/auth\.json$/, /\/\.pi\/[^/]*auth[^/]*$/,
  /\/\.ssh\/(?!config$|known_hosts$)[^/]+$/, /\/\.aws\/credentials$/, /\/\.netrc$/, /\/\.config\/op\//, /\/\.docker\/config\.json$/,
  /\.(pem|p12|pfx)$/, /\/id_(rsa|ed25519|ecdsa|dsa)$/];
// Script text that dumps the whole environment: `process.env` or `os.environ` not followed by a name.
const ENV_DUMP = /\b(?:process\.env|Bun\.env|os\.environ|Deno\.env\.toObject\(\)|ENV\.to_h)\b(?!\s*[.[])/;
const ONE_LINERS = new Set(["bun", "node", "deno", "python", "python3", "ruby", "perl"]);

/**
 * The office's own data: config and session secret, hook tokens, people's sign-ins (homes/), every terminal's
 * scrollback and the chat log. Everything under a `.agent-office/` except `worktrees/`, where the agents work.
 */
export const officeData = (abs: string) => /\/\.agent-office\/(?!worktrees(\/|$))/.test(abs) || /\/\.agent-office$/.test(abs);

export function secretPath(p: string, cwd = process.cwd()): boolean {
  // a glob that would reach one (`.env*`, `.en[v]`, `.e''nv`) is read as the plainest name it covers
  const abs = resolve(cwd, p.replace(/^~(?=\/|$)/, homedir()).replace(/['"\\]/g, "").replace(/\[(.)[^\]]*\]/g, "$1").replace(/[*?]/g, ""));
  const name = basename(abs);
  if (name === ".env" || (name.startsWith(".env.") && !SAFE_ENV.has(name))) return true;
  if (name.startsWith(".dev.vars")) return true;
  if (/^\/proc\/[^/]+\/environ$/.test(abs)) return true;
  if (/\/\.alchemy\/state(\/|$)/.test(abs)) return true;
  if (HOME_SECRETS.some((re) => re.test(abs))) return true;
  return officeData(abs);
}

// `\cat`, `c''at` and `"cat"` are `cat`.
const unquote = (t: string) => t.replace(/\\(?=[a-z])|['"]/gi, "");

// Rough shell split: one token list per simple command. Good enough for a guard.
export function segments(cmd: string): string[][] {
  return cmd
    .replace(/\$\(|`|\(|\)|\{|\}/g, ";")
    .split(/&&|\|\||[;|\n&]/)
    .map((s) => s.trim().split(/\s+/).filter(Boolean).map(unquote))
    .filter((s) => s.length);
}

// Drop `FOO=1`, `sudo`, `env [opts] FOO=1` etc. in front of the real command.
function strip(t: string[]): { rest: string[]; bareEnv: boolean } {
  let i = 0;
  for (;;) {
    const w = t[i];
    if (w === undefined) break;
    if (/^\w+=/.test(w) || ["sudo", "command", "exec", "time", "nohup", "bunx", "npx"].includes(w)) { i++; continue; }
    if (w === "env") {
      i++;
      while (t[i] !== undefined && (t[i]!.startsWith("-") || /^\w+=/.test(t[i]!))) i += t[i] === "-u" ? 2 : 1;
      if (t[i] === undefined) return { rest: [], bareEnv: true };
      continue;
    }
    break;
  }
  return { rest: t.slice(i), bareEnv: false };
}

function gitPush(t: string[], cwd: string, branchOf: BranchOf): string | null {
  let i = 1, dir = cwd;
  while (t[i]?.startsWith("-")) {
    if (t[i] === "-C") dir = resolve(dir, t[i + 1] ?? ".");
    i += t[i] === "-C" || t[i] === "-c" ? 2 : 1;
  }
  if (t[i] !== "push") return null;
  const pos: string[] = [];
  for (let j = i + 1; j < t.length; j++) {
    const a = t[j]!;
    if (a === "--force" || /^-[a-z]*f[a-z]*$/.test(a)) return "force push (use --force-with-lease on your own branch)";
    if (["--tags", "--follow-tags", "--mirror", "--all"].includes(a)) return `push ${a}`;
    if (a === "-o" || a === "--push-option" || a === "--repo" || a === "--receive-pack") { j++; continue; }
    if (!a.startsWith("-")) pos.push(a);
  }
  const refs = pos.slice(1);
  const current = () => branchOf(dir);
  if (!refs.length) return MAIN.has(current() ?? "") ? "push from main" : null;
  if (t.slice(i + 1).some((a) => a === "--delete" || a === "-d")) return "delete a remote branch";
  for (const r of refs) {
    if (r === "tag" || r.includes("refs/tags/")) return "push a tag";
    if (r.startsWith(":")) return "delete a remote branch";
    if (r.startsWith("+")) return "force push (+refspec)";
    const dst = (r.includes(":") ? r.slice(r.indexOf(":") + 1) : r).replace(/^refs\/heads\//, "");
    if (MAIN.has(dst) || (dst === "HEAD" && MAIN.has(current() ?? ""))) return "push to main";
  }
  return null;
}

// Every worktree shares one .git, so these reach other agents' work, or the hooks that run for them.
function gitShared(t: string[]): string | null {
  let i = 1;
  while (t[i]?.startsWith("-")) i += t[i] === "-C" || t[i] === "-c" ? 2 : 1;
  const [sub, a] = [t[i], t[i + 1]];
  if (sub === "worktree" && (a === "remove" || a === "prune")) return `git worktree ${a} (the office sends workers home)`;
  if (sub === "branch" && t.slice(i + 1).some((x) => x === "-D" || (x === "--force" && t.includes("--delete"))))
    return "force-delete a branch (git branch -d deletes a merged one)";
  if (t.some((x) => /^core\.hookspath/i.test(x))) return "change the shared git hooks";
  // config keys that run a command in every worktree (fsmonitor, pager, external diff, filters, ssh, credential helpers), or pull in a file
  if (sub === "config" && !t.slice(i + 1).some((x) => /^(--get|--get-all|--get-regexp|-l|--list|--show-origin|--unset)/.test(x)) &&
    t.slice(i + 1).some((x) => /^(core\.(fsmonitor|pager|editor|sshcommand|askpass|gitproxy)|diff\.external|difftool\.|mergetool\.|filter\.|credential\.|include(if)?\.|alias\.|sequence\.editor|gpg\.program|ssh\.)/i.test(x)))
    return "set a git config key that runs a command in every worktree (the office shares one .git)";
  return null;
}

// Other ways to the GitHub login: gh's own print flag, git's credential store, the keychain gh writes it to.
function tokenGrab(c: string, t: string[]): string | null {
  if (c === "gh" && t[1] === "auth" && t[2] === "status" && t.some((x) => x === "-t" || x === "--show-token")) return "print the GitHub token (gh auth status -t)";
  if (c === "git" && t.includes("credential") && t.some((x) => x === "fill" || x === "get")) return "read git's stored credentials";
  if (c === "git" && t.some((x) => /^credential-(osxkeychain|store|cache|manager)/.test(x)) && t.some((x) => x === "get")) return "read git's stored credentials";
  if (c === "security" && t.some((x) => /^(find|dump)-/.test(x))) return "read the keychain";
  return null;
}

// gh calls that change who can merge, what gates a merge, or where secrets go. The owner makes these.
const GH_ADMIN = /\/(rulesets|protection|environments|secrets|variables|collaborators|hooks|keys|releases|merges|contents|git\/tags)(\/|$)|^repos\/[^/]+\/[^/]+$/;
// Writes that move main or make a tag through the API, around the git guard above.
const GH_REFS = /\/git\/refs\/(heads\/(main|master)|tags)(\/|$)/;
function ghAdmin(t: string[]): string | null {
  const [, a1, a2] = t;
  if (a1 === "pr" && a2 === "merge" && t.includes("--admin")) return "gh pr merge --admin";
  // A PR on another PR's branch closes unmerged when that one merges and its branch is deleted: every PR goes on main.
  if (a1 === "pr" && (a2 === "create" || a2 === "edit")) {
    const k = t.findIndex((x) => x === "--base" || x === "-B");
    const base = k >= 0 ? t[k + 1] : t.find((x) => x.startsWith("--base="))?.slice(7);
    if (base !== undefined && base !== "main") return `a PR based on ${base} (stacked): base every PR on main`;
  }
  if ((a1 === "secret" || a1 === "variable" || a1 === "ruleset") && a2 !== "list" && a2 !== "view" && a2 !== "check")
    return `gh ${a1} ${a2 ?? ""}`.trim();
  if (a1 === "repo" && (a2 === "edit" || a2 === "delete" || a2 === "rename" || a2 === "archive")) return `gh repo ${a2}`;
  if (a1 === "release" && a2 !== "list" && a2 !== "view" && a2 !== "download") return `gh release ${a2 ?? ""}`.trim();
  if (a1 === "workflow" && a2 === "disable") return "gh workflow disable";
  if (a1 === "api") {
    const path = t.slice(2).find((x) => !x.startsWith("-") && /\//.test(x))?.replace(/^\//, "").replace(/\?.*/, "") ?? "";
    const m = t.findIndex((x) => x === "-X" || x === "--method");
    const method = (m >= 0 ? t[m + 1] : t.find((x) => /^(-X|--method=)\w+/.test(x))?.replace(/^(-X|--method=)/, "")) ?? "";
    const writes = (method && method.toUpperCase() !== "GET") || t.some((x) => /^(-f|-F|--field|--raw-field|--input)/.test(x));
    if (writes && (GH_ADMIN.test(path) || GH_REFS.test(path))) return `gh api write to ${path}`;
    if (writes && /\/git\/refs$/.test(path) && t.some((x) => /^ref=refs\/(tags\/|heads\/(main|master)$)/.test(x))) return `gh api write to ${path}`;
    // GraphQL has no path to check: a mutation can do all of the above
    if (t[2] === "graphql" && t.some((x) => /\bmutation\b/.test(x))) return "gh api graphql mutation";
  }
  return null;
}

function checkBash(cmd: string, cwd: string, branchOf: BranchOf): string | null {
  const segs = segments(cmd);
  // An interpreter one-liner that dumps the whole environment (grepping the source for `process.env` is fine).
  // The split above cuts the one-liner at its parentheses, so the command runs it and the whole text is searched.
  const oneLiner = segs.some((seg) => { const t = strip(seg).rest; return ONE_LINERS.has(basename(t[0] ?? "")) && t.some((x) => /^-(e|p|c|-eval|-print)$/.test(x)); });
  if (oneLiner && ENV_DUMP.test(cmd)) return "print the environment (a one-liner dumping process.env / os.environ)";
  for (const seg of segs) {
    const { rest: t, bareEnv } = strip(seg);
    if (bareEnv) return "print the environment (env)";
    if (!t[0]) continue;
    // `/usr/bin/env` is `env`.
    const c = t[0].includes("/") && t[0] !== "." ? basename(t[0]) : t[0], [, a1, a2] = t;
    if (c === "env" && t.slice(1).every((x) => x.startsWith("-") || /^\w+=/.test(x))) return "print the environment (env)";
    if (c === "printenv") return "print the environment (printenv)";
    if (c === "export" && (!a1 || a1 === "-p")) return "print the environment (export)";
    // The shell's own dumps: `set` alone, `declare -x`, `typeset -p`.
    if (c === "set" && !a1) return "print the environment (set)";
    if ((c === "declare" || c === "typeset") && t.slice(1).every((x) => x.startsWith("-"))) return `print the environment (${c})`;
    // BSD-style `ps e` and macOS `ps -E` print each process's env, other workers' AGENT_OFFICE_HOOK_TOKEN among it (#642)
    if (c === "ps" && ((a1 && /^[a-z]*e[a-z]*$/i.test(a1)) || t.some((x) => /^-[a-zA-Z]*E/.test(x))))
      return "print other processes' environment (ps e / ps -E)";
    if (c === "gh" && a1 === "auth" && a2 === "token") return "print the GitHub token";
    if (c === "wrangler" && a1 === "secret") return "wrangler secret";
    if (c === "git") { const why = gitPush(t, cwd, branchOf) ?? gitShared(t); if (why) return why; }
    if (c === "gh") { const why = ghAdmin(t); if (why) return why; }
    { const why = tokenGrab(c, t); if (why) return why; }
    if (t.slice(1).some((x) => /\.git\/hooks(\/|$)/.test(x))) return "change the shared git hooks";
    // Writes into the office's own data (its prompts, queue, worker list and the hook scripts other workers run): `> file`, tee, cp's target.
    const outs = t.slice(1).filter((x, k) => x.startsWith(">") || t[k] === ">" || t[k] === ">>" || c === "tee" || (["cp", "mv", "ln", "install", "rsync"].includes(c) && k === t.length - 2)).map((x) => x.replace(/^>+/, ""));
    const o = outs.find((x) => x && !x.startsWith("-") && officeData(resolve(cwd, x.replace(/^~(?=\/|$)/, homedir()))));
    if (o) return `write into the office's data (${o})`;
    // A reader's file arguments (curl's `@file` too), and any `< file` redirect.
    const inputs = t.slice(1).filter((x, k) => READERS.has(c) || x.startsWith("<") || t[k] === "<").map((x) => x.replace(/^[<@]+/, ""));
    const f = inputs.find((x) => x && !x.startsWith("-") && secretPath(x, cwd));
    if (f) return `read ${f}`;
  }
  return null;
}

const gitBranch: BranchOf = (cwd) => {
  const r = Bun.spawnSync(["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], { stderr: "ignore" });
  return r.exitCode === 0 ? r.stdout.toString().trim() : null;
};

export function check(input: HookInput, branchOf: BranchOf = gitBranch): string | null {
  const cwd = input.cwd ?? process.cwd();
  const ti = input.tool_input ?? {};
  if (input.tool_name === "Bash") return checkBash(String(ti.command ?? ""), cwd, branchOf);
  const p = ti.file_path ?? ti.path;
  if ((input.tool_name === "Read" || input.tool_name === "Grep") && typeof p === "string" && secretPath(p, cwd)) return `read ${p}`;
  // Grep's glob can name the file its path doesn't: `--glob .env` over the repo
  if (input.tool_name === "Grep" && typeof ti.glob === "string" && ti.glob.split(/[,\s]+/).some((g) => g && secretPath(g, cwd))) return `read ${ti.glob}`;
  if ((input.tool_name === "Write" || input.tool_name === "Edit") && typeof p === "string" && /\/\.git\/(hooks\/|config$)/.test(resolve(cwd, p)))
    return "change the shared git hooks or config";
  if ((input.tool_name === "Write" || input.tool_name === "Edit") && typeof p === "string" && officeData(resolve(cwd, p.replace(/^~(?=\/|$)/, homedir()))))
    return "write into the office's data";
  return null;
}

if (import.meta.main) {
  const why = check(JSON.parse(await Bun.stdin.text()));
  if (why) {
    console.error(`Blocked by .claude/hooks/guard.ts: ${why}. Secret values live in .dev.vars and the owner's shell; read wrangler.jsonc for variable names. main, tags, rulesets and releases are the owner's. See AGENTS.md "Secrets and pushes".`);
    process.exit(2);
  }
}
