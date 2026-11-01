import { expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cms } from "../../scripts/cms.ts";

test("editing a line in the content editor changes that text and nothing else", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cms-"));
  const file = { feed: { title: "Built for the *fleet.*", lede: "Old lede" }, pitch: ["one", "two"] };
  await writeFile(join(dir, "landing.json"), JSON.stringify(file));
  const handle = cms({ dir, title: "QNTBR" });

  const page = await (await handle(new Request("http://x/landing.json"))).text();
  expect(page).toContain("Built for the *fleet.*");

  const form = new URLSearchParams(); // what the page's <form method=post> sends
  form.set(JSON.stringify(["feed", "lede"]), "New lede");
  form.set(JSON.stringify(["feed", "extra"]), "a key the file never had");
  const saved = await handle(new Request("http://x/landing.json", { method: "POST", body: form }));
  expect(saved.status).toBe(303);

  const after: unknown = JSON.parse(await readFile(join(dir, "landing.json"), "utf8"));
  expect(after).toEqual({ feed: { title: "Built for the *fleet.*", lede: "New lede" }, pitch: ["one", "two"] });
});
