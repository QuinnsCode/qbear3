// tests/unit/lab.test.ts
// The landing lab's table: every verb + noun pair makes exactly one thing, and a thing
// dropped on itself walks the shelf and wraps around.
import { expect, test } from "bun:test";
import { combineLab, labItems, nothingLine, NOTHING_LINES, recipes } from "../../src/app/pages/landing/lab.ts";

const request = new Request("https://qntbr.com/");
const bag = labItems(request);
const word = (id: string) => bag.find((i) => i.id === id)!;
const things = bag.filter((i) => i.group === "game" || i.group === "app");

test("every thing in the bag has a verb + noun recipe that makes it, and no two share one", () => {
  const made = new Set<string>();
  for (const [pair, key] of recipes) {
    const [verb, noun] = pair.split("+").map(word);
    const out = combineLab(verb!, noun!, bag);
    expect(out?.item?.id).toBe(key);
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

test("a verb on the wrong noun, two different apps, or an app on a word is nothing", () => {
  expect(combineLab(word("verb:skate"), word("noun:cards"), bag)).toBeNull();
  expect(combineLab(word("sanctum"), word("sandbox"), bag)).toBeNull();
  expect(combineLab(word("sandbox"), word("noun:cards"), bag)).toBeNull();
  expect(combineLab(word("noun:cards"), word("noun:park"), bag)).toBeNull();
  expect(nothingLine(NOTHING_LINES.length + 2)).toBe(NOTHING_LINES[2]);
});

test("an app dropped on itself becomes the next one, and the last wraps to the first", () => {
  const first = things[0]!;
  const last = things[things.length - 1]!;
  expect(combineLab(first, first, bag)?.item?.id).toBe(things[1]!.id);
  expect(combineLab(last, last, bag)?.item?.id).toBe(first.id);
});

test("a word on itself just talks: nothing is made and nothing is consumed", () => {
  const twice = combineLab(word("verb:skate"), word("verb:skate"), bag);
  expect(twice?.item).toBeUndefined();
  expect(twice?.message).toContain("Skate");
  expect(combineLab(word("noun:oil"), word("noun:oil"), bag)?.item).toBeUndefined();
});
