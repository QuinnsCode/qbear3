// The content editor: `pnpm run cms`. Serves every content/*.json as a page of textareas on 127.0.0.1 and
// saves back to the same file, so the words on the landing page and the Game Center can be edited by hand.
// The form can only change text: the shape of the file is read from the file itself, so it can never add,
// drop or retype a key. Vendored from Rusty Buns' packages/cms (private, not published), plus the CLI below.
// Needs Bun. In a string, *starred* text renders as emphasis on the site.

import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type Path = string[];
export interface Field { path: Path; list: boolean; text: string }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** The editable text in a file: every string, and every list of strings, in the order written. */
export function fieldsOf(json: unknown, path: Path = []): Field[] {
  if (typeof json === "string") return [{ path, list: false, text: json }];
  if (isStrings(json)) return [{ path, list: true, text: json.join("\n") }];
  if (!isRecord(json)) return [];
  return Object.entries(json).flatMap(([k, v]) => fieldsOf(v, [...path, k]));
}

const nameOf = (p: Path) => JSON.stringify(p);

/** The file with each field's text swapped for what the form sent. Fields the form left out stay as they were. */
export function applyForm(json: unknown, form: ReadonlyMap<string, string>, path: Path = []): unknown {
  const sent = form.get(nameOf(path));
  if (typeof json === "string") return sent === undefined ? json : sent.replace(/\r\n/g, "\n").trim();
  if (isStrings(json)) return sent === undefined ? json : sent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!isRecord(json)) return json;
  return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, applyForm(v, form, [...path, k])]));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CSS = `:root{--bg:#fff;--fg:#0a0a0a;--muted:#6b6b6b;--border:#e6e6e6;--border-2:#cfcfcf;--paper:#fcfbf8;--accent:#e8590c;--sans:"Geist",ui-sans-serif,system-ui,sans-serif;--mono:"Geist Mono",ui-monospace,monospace}
@media(prefers-color-scheme:dark){:root{--bg:#0e0e0e;--fg:#f2f2f2;--muted:#a0a0a0;--border:#2a2a2a;--border-2:#3d3d3d;--paper:#151515}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 var(--sans)}a{color:var(--accent)}
.wrap{max-width:820px;margin:0 auto;padding:24px 16px 96px}
nav{display:flex;gap:14px;align-items:center;margin-bottom:22px;font-weight:600}nav a{color:var(--fg);text-decoration:none;letter-spacing:-.02em}
h1{font:600 clamp(28px,5vw,44px)/1.05 var(--sans);letter-spacing:-.045em;margin:6px 0 8px}h1 em{font-style:normal;color:var(--accent)}
h2{font:600 13px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 6px}
.lede,.hint{color:var(--muted)}.hint{font-size:13px;margin:0 0 4px}
.file{border:1px solid var(--border-2);border-top:4px solid var(--accent);border-radius:8px;background:var(--paper);padding:6px 20px 18px;margin-bottom:18px}
.file section{padding:14px 0;border-bottom:1px dashed var(--border-2)}.file section:last-child{border-bottom:0;padding-bottom:0}
label{display:block;font:600 12px var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px}
textarea{width:100%;font:14px/1.5 var(--sans);color:var(--fg);background:var(--bg);border:1px solid var(--border-2);border-radius:6px;padding:8px 10px;resize:vertical}
textarea:focus{outline:2px solid var(--accent);outline-offset:-1px}
.bar{position:sticky;bottom:0;background:var(--bg);border-top:1px solid var(--border);padding:12px 0;display:flex;gap:14px;align-items:center}
button{font:600 14px var(--sans);color:var(--fg);background:var(--paper);border:1px solid var(--border-2);border-bottom-width:3px;border-bottom-color:var(--accent);border-radius:6px;padding:7px 16px;cursor:pointer}
button:hover{background:var(--bg)}.ok{color:var(--accent);font-weight:600}ul.files{list-style:none;padding:0;margin:0}ul.files li{padding:10px 0;border-bottom:1px dashed var(--border-2)}`;

const page = (title: string, body: string) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style><div class="wrap">${body}</div>`,
  { headers: { "content-type": "text/html; charset=utf-8" } });

const rowsOf = (f: Field) => Math.min(24, Math.max(2, f.text.split("\n").length + (f.list ? 1 : Math.floor(f.text.length / 80))));

export interface CmsOptions { dir: string; title: string }

/** The editor as a request handler, so a test can drive it without a port. */
export function cms({ dir, title }: CmsOptions): (req: Request) => Promise<Response> {
  const names = async () => (await readdir(dir)).filter((n) => n.endsWith(".json")).sort();
  const read = async (name: string): Promise<unknown> => JSON.parse(await Bun.file(join(dir, name)).text());
  const head = `<nav><a href="/">${esc(title)}</a></nav>`;

  return async (req) => {
    const url = new URL(req.url);
    if (req.method === "POST" && req.headers.get("origin") !== null && req.headers.get("origin") !== url.origin) return new Response("Cross-site form refused", { status: 403 });
    const all = await names();
    if (url.pathname === "/") {
      const items = all.map((n) => `<li><a href="/${encodeURIComponent(n)}">${esc(n.replace(/\.json$/, ""))}</a></li>`).join("");
      return page(title, `${head}<h1>${esc(title)} <em>script</em></h1><p class="lede">Pick a file, change the words, save. It writes straight to <code>${esc(dir)}</code>.</p><ul class="files">${items}</ul>`);
    }
    const name = decodeURIComponent(url.pathname.slice(1));
    if (!all.includes(name)) return new Response("Not found", { status: 404 });
    if (req.method === "POST") {
      const form = new Map<string, string>();
      (await req.formData()).forEach((v, k) => { if (typeof v === "string") form.set(k, v); });
      const next = applyForm(await read(name), form);
      await mkdir(dir, { recursive: true });
      const tmp = join(dir, `.${name}.tmp`);
      await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`);
      await rename(tmp, join(dir, name));
      return new Response(null, { status: 303, headers: { location: `/${encodeURIComponent(name)}?saved=1` } });
    }
    const groups = new Map<string, Field[]>();
    for (const f of fieldsOf(await read(name))) groups.set(f.path[0] ?? "", [...(groups.get(f.path[0] ?? "") ?? []), f]);
    const sections = [...groups].map(([g, fs]) => `<section><h2>${esc(g)}</h2>${fs.map((f) => `<label for="${esc(nameOf(f.path))}">${esc(f.path.slice(1).join(" / ") || g)}</label>${f.list ? `<p class="hint">One per line.</p>` : ""}<textarea id="${esc(nameOf(f.path))}" name="${esc(nameOf(f.path))}" rows="${rowsOf(f)}">${esc(f.text)}</textarea>`).join("")}</section>`).join("");
    return page(`${name} · ${title}`, `${head}<h1>${esc(name.replace(/\.json$/, ""))}</h1><form method="post"><div class="file">${sections}</div><div class="bar"><button>Save</button>${url.searchParams.has("saved") ? `<span class="ok">Saved.</span>` : ""}<a href="/">All files</a></div></form>`);
  };
}

export function serveCms(opts: CmsOptions & { port: number }) {
  return Bun.serve({ hostname: "127.0.0.1", port: opts.port, fetch: cms(opts) });
}


if (import.meta.main) {
const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
const dir = resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? "content");
const title = flag("title") ?? "QNTBR";
const port = Number(flag("port") ?? 4700);
const server = serveCms({ dir, title, port });
console.log(`${title}: editing ${dir} at http://localhost:${server.port}`);
}
