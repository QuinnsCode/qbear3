// tests/e2e/auth.test.ts
// Sign up, the auto-created lair, who may enter it, sign out and back in.
// All through better-auth's own endpoints and the pages' redirects: what the signup and
// login forms do once their JavaScript has run, minus the JavaScript.
import { expect, test } from "bun:test";
import { app, uniqueEmail } from "./kit.ts";

test("sign up: the main domain sends you to your own lair's sanctum", async () => {
  const a = await app();
  const b = a.browser();
  const email = uniqueEmail("one");
  const made = await b.signUp({ email, name: "E2E One" });
  expect(made.user.email).toBe(email);
  expect(b.cookie).toContain("better-auth.session_token=");

  const home = await b.get("/");
  expect(home.hops.map((h) => h.status)).toEqual([302]);
  expect(home.url.hostname).toMatch(/^one-[a-z0-9]+\.localhost$/);
  expect(home.url.pathname).toBe("/sanctum");
  expect(home.status).toBe(200);
  expect(home.body).toContain("Lair");

  // The lair's own root goes to the sanctum too.
  const root = await b.get("/", { host: home.url.host });
  expect(root.hops.map((h) => h.status)).toEqual([302]);
  expect(root.url.pathname).toBe("/sanctum");
  expect(root.status).toBe(200);
});

test("a lair is private: visitors log in, other members see No Access", async () => {
  const a = await app();
  const owner = a.browser();
  await owner.signUp({ email: uniqueEmail("owner"), name: "Owner" });
  const lair = (await owner.get("/")).url.host;

  const visitor = await a.browser().get("/sanctum", { host: lair });
  expect(new URL(visitor.hops[0]!.location!).pathname).toBe("/user/login");
  expect(visitor.url.pathname).toBe("/user/login");
  expect(visitor.status).toBe(200);

  const other = a.browser();
  await other.signUp({ email: uniqueEmail("other"), name: "Other" });
  const sanctum = await other.get("/sanctum", { host: lair });
  expect(sanctum.status).toBe(200);
  expect(sanctum.body).toContain("No Access");
  // Their root never lands on the owner's lair either.
  const root = await other.get("/", { host: lair });
  expect(root.url.host).not.toBe(lair);
});

test("sign out, sign in again, same lair; a wrong password is refused", async () => {
  const a = await app();
  const b = a.browser();
  const email = uniqueEmail("back");
  await b.signUp({ email, name: "Back Again" });
  const lair = (await b.get("/")).url.host;

  expect((await b.signOut()).status).toBe(200);
  const loggedOut = await b.get("/");
  expect(loggedOut.hops).toEqual([]);
  expect(loggedOut.url.host).toBe(a.host);

  expect((await b.signIn(email, "not-the-password")).status).toBe(401);
  expect((await b.signIn(email)).status).toBe(200);
  const back = await b.get("/");
  expect(back.url.host).toBe(lair);
  expect(back.url.pathname).toBe("/sanctum");
  expect(back.status).toBe(200);
});
