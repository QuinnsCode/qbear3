// tests/e2e/setup.ts
// Preloaded by bunfig.toml for every `bun test` run: stops the vite server the kit started
// (if any) once every test file has run. Bun runs lifecycle hooks in a preload file once per run.
import { afterAll } from "bun:test";
import { stopApp } from "./kit.ts";

afterAll(async () => { await stopApp(); });
