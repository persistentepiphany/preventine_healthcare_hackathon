import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatch } from "../src/http/router.js";
import { SessionStore } from "../src/storage/sessions.js";

/**
 * HTTP-level tests for /api/nhs/session(/:id). Each test runs against an
 * isolated SessionStore writing into a tmp dir so they don't pollute the
 * shared default store.
 */

let dir: string;
let store: SessionStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "preventpath-api-session-"));
  store = new SessionStore({ dir });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const opt = () => ({ sessionStore: store });

describe("POST /api/nhs/session — create", () => {
  it("empty body → 201 + new id + empty patient", async () => {
    const r = await dispatch("POST", "/api/nhs/session", new URLSearchParams(), undefined, opt());
    expect(r.status).toBe(201);
    const b = r.body as { id: string; patient: unknown; previouslyMissing: string[] };
    expect(typeof b.id).toBe("string");
    expect(b.patient).toEqual({});
    expect(b.previouslyMissing).toEqual([]);
  });
  it("seed body → 201 + seeded fields", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/session",
      new URLSearchParams(),
      { patient: { age: 50 }, postcode: "M13 9PL" },
      opt(),
    );
    expect(r.status).toBe(201);
    const b = r.body as { patient: { age: number }; postcode: string };
    expect(b.patient.age).toBe(50);
    expect(b.postcode).toBe("M13 9PL");
  });
});

describe("GET /api/nhs/session/:id — read", () => {
  it("existing id → 200 + data", async () => {
    const created = await dispatch("POST", "/api/nhs/session", new URLSearchParams(), { patient: { age: 60 } }, opt());
    const id = (created.body as { id: string }).id;
    const r = await dispatch("GET", `/api/nhs/session/${id}`, new URLSearchParams(), undefined, opt());
    expect(r.status).toBe(200);
    expect((r.body as { patient: { age: number } }).patient.age).toBe(60);
  });
  it("unknown id → 404", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/session/8e6c2a4f-cd6f-4d7d-9d9e-12c5a8b3f7c9",
      new URLSearchParams(),
      undefined,
      opt(),
    );
    expect(r.status).toBe(404);
  });
  it("invalid id (path-traversal attempt) → 400", async () => {
    const r = await dispatch(
      "GET",
      "/api/nhs/session/..%2F..%2Fetc",
      new URLSearchParams(),
      undefined,
      opt(),
    );
    expect(r.status).toBe(400);
  });
});

describe("PATCH /api/nhs/session/:id — merge update", () => {
  it("merges new fields into patient without dropping existing ones", async () => {
    const created = await dispatch(
      "POST",
      "/api/nhs/session",
      new URLSearchParams(),
      { patient: { age: 52, livesInEngland: true } },
      opt(),
    );
    const id = (created.body as { id: string }).id;
    const r = await dispatch(
      "PATCH",
      `/api/nhs/session/${id}`,
      new URLSearchParams(),
      { patient: { systolicBp: 122 } },
      opt(),
    );
    expect(r.status).toBe(200);
    expect((r.body as { patient: Record<string, unknown> }).patient).toEqual({
      age: 52,
      livesInEngland: true,
      systolicBp: 122,
    });
  });
  it("PATCH on unknown id → 404", async () => {
    const r = await dispatch(
      "PATCH",
      "/api/nhs/session/8e6c2a4f-cd6f-4d7d-9d9e-12c5a8b3f7c9",
      new URLSearchParams(),
      { patient: { age: 50 } },
      opt(),
    );
    expect(r.status).toBe(404);
  });
});

describe("PUT /api/nhs/session/:id — replace", () => {
  it("replaces the patient wholesale", async () => {
    const created = await dispatch(
      "POST",
      "/api/nhs/session",
      new URLSearchParams(),
      { patient: { age: 30, systolicBp: 100 } },
      opt(),
    );
    const id = (created.body as { id: string }).id;
    const r = await dispatch(
      "PUT",
      `/api/nhs/session/${id}`,
      new URLSearchParams(),
      { patient: { age: 60 }, previouslyMissing: ["cholesterol"] },
      opt(),
    );
    expect(r.status).toBe(200);
    expect((r.body as { patient: Record<string, unknown> }).patient).toEqual({ age: 60 });
    expect((r.body as { previouslyMissing: string[] }).previouslyMissing).toEqual(["cholesterol"]);
  });
});

describe("DELETE /api/nhs/session/:id", () => {
  it("removes the session, next GET → 404", async () => {
    const created = await dispatch("POST", "/api/nhs/session", new URLSearchParams(), undefined, opt());
    const id = (created.body as { id: string }).id;
    const d = await dispatch("DELETE", `/api/nhs/session/${id}`, new URLSearchParams(), undefined, opt());
    expect(d.status).toBe(200);
    const g = await dispatch("GET", `/api/nhs/session/${id}`, new URLSearchParams(), undefined, opt());
    expect(g.status).toBe(404);
  });
});

describe("GET /api/nhs/session — list", () => {
  it("returns ids newest-first", async () => {
    const a = await dispatch("POST", "/api/nhs/session", new URLSearchParams(), undefined, opt());
    await new Promise((r) => setTimeout(r, 5));
    const b = await dispatch("POST", "/api/nhs/session", new URLSearchParams(), undefined, opt());
    const r = await dispatch("GET", "/api/nhs/session", new URLSearchParams(), undefined, opt());
    expect(r.status).toBe(200);
    const ids = (r.body as { sessions: { id: string }[] }).sessions.map((s) => s.id);
    expect(ids).toEqual([
      (b.body as { id: string }).id,
      (a.body as { id: string }).id,
    ]);
  });
});

describe("method validation", () => {
  it("PUT on collection → 405", async () => {
    const r = await dispatch("PUT", "/api/nhs/session", new URLSearchParams(), {}, opt());
    expect(r.status).toBe(405);
  });
  it("POST on resource → 405", async () => {
    const r = await dispatch(
      "POST",
      "/api/nhs/session/8e6c2a4f-cd6f-4d7d-9d9e-12c5a8b3f7c9",
      new URLSearchParams(),
      {},
      opt(),
    );
    expect(r.status).toBe(405);
  });
});
