// tests/e2e/auth.test.ts
// Sign up, sign out and back in, through better-auth's own endpoints.
import { expect, test } from "bun:test";
import { app, uniqueEmail } from "./kit.ts";

test("sign up gives a session; sign out, sign in again; a wrong password is refused", async () => {
  const a = await app();
  const b = a.browser();
  const email = uniqueEmail("back");
  const made = await b.signUp({ email, name: "Back Again" });
  expect(made.user.email).toBe(email);
  expect(b.cookie).toContain("better-auth.session_token=");

  // Signed in, the main domain stays on the main domain: no per-user subdomain to land on.
  const home = await b.get("/");
  expect(home.hops).toEqual([]);
  expect(home.url.host).toBe(a.host);
  expect(home.status).toBe(200);

  expect((await b.signOut()).status).toBe(200);
  expect((await b.signIn(email, "not-the-password")).status).toBe(401);
  expect((await b.signIn(email)).status).toBe(200);
});

test("an eqosys callback with no sign-in in flight lands on the login page with an error, signed out", async () => {
  const a = await app();
  const b = a.browser();
  const res = await b.get("/api/auth/oauth2/callback/eqosys?code=abc&state=forged");
  expect(res.url.pathname).toBe("/user/login");
  expect(res.url.searchParams.get("error")).toBe("eqosys_state");
  expect(b.cookie).not.toContain("session_token");
  expect((await b.get("/")).hops).toEqual([]);
});
