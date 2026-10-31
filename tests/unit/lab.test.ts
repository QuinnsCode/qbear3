// tests/unit/lab.test.ts
// The landing lab's table: every verb + noun pair makes its own thing, and every other drop
// still lands on some app.
import { expect, test } from "bun:test";
import { combineLab, labItems, recipes } from "../../src/app/pages/landing/lab.ts";

const request = new Request("https://qntbr.com/");
const bag = labItems(request);
const word = (id: string) => bag.find((i) => i.id === id)!;
const things = bag.filter((i) => i.group === "game" || i.group === "app");
const words = bag.filter((i) => i.group === "verb" || i.group === "noun");
const isThing = (id: string | undefined) => things.some((t) => t.id === id);

test("every thing in the bag has a verb + noun recipe that makes it, and no two share one", () => {
  const made = new Set<string>();
  for (const [pair, key] of recipes) {
    const [verb, noun] = pair.split("+").map(word);
    expect(combineLab(verb!, noun!, bag)?.item?.id).toBe(key);
    // Order does not matter: the noun can be dropped on the verb.
    expect(combineLab(noun!, verb!, bag)?.item?.id).toBe(key);
    made.add(key);
  }
  expect([...made].sort()).toEqual(things.map((t) => t.id).sort());
  expect(recipes.size).toBe(things.length);
});

test("the sandbox link is built for the host it is asked from", () => {
  const sandbox = labItems(new Request("http://localhost:5173/")).find((i) => i.id === "sandbox")!;
  expect(sandbox.href).toBe("http://sandbox.127.0.0.1.nip.io:5173/");
  expect(word("sandbox").href).toBe("https://sandbox.qntbr.com/");
});

test("any two words make an app, and the same two always make the same one", () => {
  for (const a of words) {
    for (const b of words) {
      const out = combineLab(a, b, bag);
      expect(isThing(out?.item?.id)).toBe(true);
      expect(combineLab(b, a, bag)?.item?.id).toBe(out!.item!.id);
    }
  }
});

test("a word on itself makes an app that word is in", () => {
  for (const w of words) {
    const key = combineLab(w, w, bag)?.item?.id;
    expect([...recipes].some(([pair, k]) => k === key && pair.split("+").includes(w.id))).toBe(true);
  }
});

test("two apps, or one on itself, make some other app; an app on a word makes another app", () => {
  const [first, second] = things;
  for (const roll of [0, 0.5, 0.999]) {
    const dice = () => roll;
    for (const [a, b] of [[first!, second!], [first!, first!]] as const) {
      const out = combineLab(a, b, bag, dice)?.item?.id;
      expect(isThing(out)).toBe(true);
      expect(out).not.toBe(a.id);
      expect(out).not.toBe(b.id);
    }
    const out = combineLab(first!, word("noun:cards"), bag, dice)?.item?.id;
    expect(isThing(out)).toBe(true);
    expect(out).not.toBe(first!.id);
  }
});
