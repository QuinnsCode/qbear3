// tests/e2e/kit.ts
// The app under test, driven over HTTP from `bun test`. No browser binaries, no Playwright.
//
// Where requests go: E2E_BASE_URL when set (a server you already run: `vite dev`, the Rusty
// Buns desktop host, a wrangler preview). Otherwise the kit starts `vite dev` on a free port
// the first time a test asks for the app, and setup.ts stops it when the run ends.
//
// Subdomains: every request carries an explicit Host header, so `org1.localhost` needs no
// DNS entry and no nip.io. The server sees exactly the host the app's middleware parses for
// an org slug, and redirects to `*.localhost` hosts are followed the same way.
//
// Cookies: one jar per Browser, shared across the main host and every `*.localhost` lair.
// In production better-auth sets its cookie on `.qntbr.com`, so every lair subdomain gets
// it; on localhost it cannot, so the jar does what the production cookie does. A test that
// wants a second identity makes a second Browser.
import { setDefaultTimeout } from "bun:test";
import { join } from "node:path";

// rwsdk scans directives and boots workerd on the first request: minutes on a cold machine.
setDefaultTimeout(Number(process.env.E2E_TEST_TIMEOUT_MS ?? 180_000));

const ROOT = join(import.meta.dir, "../..");
const BOOT_MS = Number(process.env.E2E_BOOT_MS ?? 300_000);
const MAX_HOPS = 10;

export interface App {
  /** The address requests go to on the wire, e.g. http://[::1]:5199 */
  origin: string;
  /** The Host header of the main domain, e.g. localhost:5199 */
  host: string;
  port: string;
  /** `slug.localhost:<port>`: the Host header of a lair. */
  lair(slug: string): string;
  browser(): Browser;
}

export interface Hop { status: number; location: string | null }

export interface PageResponse {
  status: number;
  /** The URL answered last, with the host the app saw (not the wire address). */
  url: URL;
  headers: Headers;
  body: string;
  /** The redirects followed before this answer, in order. */
  hops: Hop[];
  json<T = any>(): T;
}

export interface RequestOptions {
  method?: string;
  /** An object is sent as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
  /** The Host header, for a path target. Default: the main domain. */
  host?: string;
  /** Follow redirects to this app's hosts. Default true. */
  follow?: boolean;
}

export const PASSWORD = "TestPassword123!";

/** An address that is this app's own: the main domain or a lair under it. */
export function isAppHost(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

async function freePort(): Promise<number> {
  const s = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response() });
  const port = s.port!;
  s.stop(true);
  return port;
}

/** A rough timestamped id: an email the app has never seen, whose lair slug starts with `prefix-`. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
}

let starting: Promise<App> | undefined;
let server: { proc: ReturnType<typeof Bun.spawn>; log: string[] } | undefined;

/** The app, started on first use. Every test file shares one. */
export function app(): Promise<App> {
  return (starting ??= boot());
}

async function boot(): Promise<App> {
  const base = process.env.E2E_BASE_URL;
  if (base) {
    const u = new URL(base);
    return make(u.origin, process.env.E2E_HOST ?? u.host, u.port || (u.protocol === "https:" ? "443" : "80"));
  }
  const port = String(await freePort());
  const log: string[] = [];
  const proc = Bun.spawn([join(ROOT, "node_modules/.bin/vite"), "dev", "--port", port, "--strictPort"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "development", FORCE_COLOR: "0" },
    stdout: "pipe",
    stderr: "pipe",
  });
  server = { proc, log };
  const tail = async (s: ReadableStream<Uint8Array>) => { for await (const chunk of s) { log.push(new TextDecoder().decode(chunk)); if (log.length > 200) log.shift(); } };
  void tail(proc.stdout as ReadableStream<Uint8Array>);
  void tail(proc.stderr as ReadableStream<Uint8Array>);
  process.on("exit", () => proc.kill());
  console.log(`[e2e] vite dev on port ${port}; waiting for the first page (rwsdk cold start)`);
  // Vite binds "localhost", which is ::1 on some machines and 127.0.0.1 on others.
  const host = `localhost:${port}`;
  const deadline = Date.now() + BOOT_MS;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`vite dev exited (${proc.exitCode}):\n${log.join("")}`);
    for (const origin of [`http://[::1]:${port}`, `http://127.0.0.1:${port}`]) {
      try {
        const res = await fetch(`${origin}/`, { headers: { host }, redirect: "manual", signal: AbortSignal.timeout(deadline - Date.now()) });
        if (res.status === 200) { console.log(`[e2e] up at ${origin} (Host ${host})`); return make(origin, host, port); }
      } catch {}
    }
    await Bun.sleep(1000);
  }
  proc.kill();
  throw new Error(`vite dev did not answer within ${BOOT_MS} ms (E2E_BOOT_MS):\n${log.join("")}`);
}

/** Stop the server the kit started. A no-op for E2E_BASE_URL. Called from setup.ts. */
export async function stopApp(): Promise<void> {
  if (!server) return;
  const { proc } = server;
  server = undefined;
  if (proc.exitCode !== null) return;
  proc.kill("SIGTERM");
  const exited = await Promise.race([proc.exited, Bun.sleep(10_000).then(() => "timeout" as const)]);
  if (exited === "timeout") proc.kill("SIGKILL");
}

function make(origin: string, host: string, port: string): App {
  const a: App = {
    origin, host, port,
    lair: (slug) => `${slug}.localhost:${port}`,
    browser: () => new Browser(a),
  };
  return a;
}

/** A cookie jar and a way to ask for pages and APIs as one visitor. */
export class Browser {
  readonly jar = new Map<string, string>();
  constructor(readonly app: App) {}

  get cookie(): string { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "); }

  /** GET a path on the main domain (or `host`), or an absolute URL of this app. */
  get(target: string, o: RequestOptions = {}): Promise<PageResponse> { return this.request(target, o); }

  /** POST JSON. The Origin header is the host's own, as a browser would send. */
  post(target: string, body: unknown, o: RequestOptions = {}): Promise<PageResponse> { return this.request(target, { ...o, method: "POST", body }); }

  async request(target: string, o: RequestOptions = {}): Promise<PageResponse> {
    let current = target.startsWith("http") ? new URL(target) : new URL(`http://${o.host ?? this.app.host}${target}`);
    if (!isAppHost(current.hostname)) throw new Error(`${target} is not on this app`);
    const hops: Hop[] = [];
    let method = o.method ?? "GET";
    let body = o.body;
    for (;;) {
      const host = `${current.hostname}:${this.app.port}`; // the app hardcodes :5173 in one redirect; our port is the one that answers
      const headers = new Headers(o.headers);
      headers.set("host", host);
      if (this.cookie) headers.set("cookie", this.cookie);
      if (method !== "GET" && method !== "HEAD") {
        headers.set("origin", `http://${host}`);
        if (body !== undefined && typeof body !== "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
      }
      const res = await fetch(`${this.app.origin}${current.pathname}${current.search}`, {
        method, headers, redirect: "manual",
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      });
      for (const c of res.headers.getSetCookie()) {
        const [kv, ...attrs] = c.split(";");
        const i = kv!.indexOf("=");
        const name = kv!.slice(0, i).trim(), value = kv!.slice(i + 1).trim();
        if (attrs.some((a) => /^\s*max-age=0\s*$/i.test(a)) || value === "") this.jar.delete(name); else this.jar.set(name, value);
      }
      const location = res.headers.get("location");
      const text = await res.text();
      const page: PageResponse = {
        status: res.status, url: new URL(`http://${host}${current.pathname}${current.search}`), headers: res.headers, body: text, hops,
        json: () => JSON.parse(text),
      };
      if (!(o.follow ?? true) || res.status < 300 || res.status >= 400 || !location) return page;
      const next = new URL(location, current);
      hops.push({ status: res.status, location: next.href });
      if (!isAppHost(next.hostname)) return page; // off to qntbr.com or elsewhere: the test looks at hops
      if (hops.length >= MAX_HOPS) throw new Error(`more than ${MAX_HOPS} redirects: ${hops.map((h) => h.location).join(" -> ")}`);
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST")) { method = "GET"; body = undefined; }
      current = next;
    }
  }

  /** Sign up through better-auth; the session cookie lands in the jar. */
  async signUp(u: { email: string; password?: string; name?: string }) {
    const res = await this.post("/api/auth/sign-up/email", { email: u.email, password: u.password ?? PASSWORD, name: u.name ?? u.email.split("@")[0] });
    if (res.status !== 200) throw new Error(`sign-up ${res.status}: ${res.body}`);
    return res.json<{ token: string; user: { id: string; email: string; name: string } }>();
  }

  signIn(email: string, password = PASSWORD) { return this.post("/api/auth/sign-in/email", { email, password }); }

  signOut() { return this.post("/api/auth/sign-out", {}); }
}

// ---- HTML, read the way the old locators read it: by tag, attribute and text ----

export interface Tag { attrs: Record<string, string>; text: string }

/** Every `<name ...>...</name>` in `html`, with its attributes and text content (tags stripped). */
export function tags(html: string, name: string): Tag[] {
  const re = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi");
  const out: Tag[] = [];
  for (const m of html.matchAll(re)) {
    const attrs: Record<string, string> = {};
    for (const a of m[1]!.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]!] = a[2]!;
    out.push({ attrs, text: m[2]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() });
  }
  return out;
}

/** The anchors matching every attribute given (class matches one class name). */
export function links(html: string, match: { href?: string; class?: string; text?: string | RegExp }): Tag[] {
  return tags(html, "a").filter((t) =>
    (match.href === undefined || t.attrs.href === match.href) &&
    (match.class === undefined || (t.attrs.class ?? "").split(/\s+/).includes(match.class)) &&
    (match.text === undefined || (typeof match.text === "string" ? t.text === match.text : match.text.test(t.text))));
}

/** The text of every h1..h6. */
export function headings(html: string): string[] {
  return [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => m[2]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

/** Whether a `<section id="...">` is on the page. */
export function hasSection(html: string, id: string): boolean {
  return new RegExp(`<section\\b[^>]*\\bid="${id}"`).test(html);
}
