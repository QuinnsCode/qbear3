// tests/e2e/reservedNames.test.ts
// Which names a person can claim as an org slug (create org, signup, username check).
import { expect, test } from "bun:test";
import { isReservedSubdomain, isSubdomainAvailable, validateSubdomainForOrg } from "../../src/lib/subdomains.ts";

test("system and sibling-app names can't be claimed as an org", () => {
  for (const name of ["eqosys", "qcrm", "www", "api", "auth", "admin", "app", "mail", "sandbox", "EQOSYS"]) {
    expect(isReservedSubdomain(name)).toBe(true);
  }
  expect(isSubdomainAvailable("eqosys").available).toBe(false);
  expect(() => validateSubdomainForOrg("eqosys")).toThrow();
});

test("an ordinary name is still available", () => {
  expect(isReservedSubdomain("mylairname")).toBe(false);
  expect(isSubdomainAvailable("mylairname")).toEqual({ available: true });
});
