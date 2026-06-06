import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionStore, isValidSessionId } from "../src/storage/sessions.js";

/**
 * Unit tests for the file-backed session store. Each test gets its own
 * tmp dir so concurrent runs and the default ~/data/sessions/ dir never
 * collide.
 */

let dir: string;
let store: SessionStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "preventpath-session-"));
  store = new SessionStore({ dir });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("isValidSessionId", () => {
  it("accepts canonical UUID v4 shape", () => {
    expect(isValidSessionId("8e6c2a4f-cd6f-4d7d-9d9e-12c5a8b3f7c9")).toBe(true);
  });
  it("rejects path-traversal strings", () => {
    expect(isValidSessionId("../../etc/passwd")).toBe(false);
    expect(isValidSessionId("..")).toBe(false);
    expect(isValidSessionId("a/b")).toBe(false);
  });
  it("rejects too-short / too-long / wrong shape", () => {
    expect(isValidSessionId("not-a-uuid")).toBe(false);
    expect(isValidSessionId("")).toBe(false);
    expect(isValidSessionId("12345")).toBe(false);
  });
});

describe("SessionStore — create / get", () => {
  it("creates a new session with empty patient and timestamps", async () => {
    const { id, data } = await store.create();
    expect(isValidSessionId(id)).toBe(true);
    expect(data.patient).toEqual({});
    expect(data.previouslyMissing).toEqual([]);
    expect(Date.parse(data.createdAt)).toBeGreaterThan(0);
    expect(data.updatedAt).toBe(data.createdAt);
  });
  it("creates with seed fields", async () => {
    const { id, data } = await store.create({
      patient: { age: 50 },
      postcode: "M13 9PL",
      previouslyMissing: ["blood pressure"],
    });
    expect(data.patient).toEqual({ age: 50 });
    expect(data.postcode).toBe("M13 9PL");
    expect(data.previouslyMissing).toEqual(["blood pressure"]);
    const readBack = await store.get(id);
    expect(readBack).toEqual(data);
  });
  it("get returns null for unknown id", async () => {
    expect(await store.get("8e6c2a4f-cd6f-4d7d-9d9e-12c5a8b3f7c9")).toBeNull();
  });
  it("get returns null for invalid id shape", async () => {
    expect(await store.get("../etc")).toBeNull();
  });
});

describe("SessionStore — patch (shallow-merge)", () => {
  it("merges patient fields without dropping existing ones", async () => {
    const { id } = await store.create({ patient: { age: 50, livesInEngland: true } });
    const after = await store.patch(id, { patient: { systolicBp: 122 } });
    expect(after?.patient).toEqual({ age: 50, livesInEngland: true, systolicBp: 122 });
  });
  it("can update postcode without touching patient", async () => {
    const { id } = await store.create({ patient: { age: 50 } });
    const after = await store.patch(id, { postcode: "SW1A 1AA" });
    expect(after?.patient).toEqual({ age: 50 });
    expect(after?.postcode).toBe("SW1A 1AA");
  });
  it("updates the updatedAt timestamp", async () => {
    const { id, data } = await store.create();
    await new Promise((r) => setTimeout(r, 5));
    const after = await store.patch(id, { patient: { age: 30 } });
    expect(Date.parse(after!.updatedAt)).toBeGreaterThan(Date.parse(data.updatedAt));
    expect(after?.createdAt).toBe(data.createdAt);
  });
  it("patch on unknown id → null", async () => {
    expect(
      await store.patch("8e6c2a4f-cd6f-4d7d-9d9e-12c5a8b3f7c9", { patient: { age: 50 } }),
    ).toBeNull();
  });
});

describe("SessionStore — put (replace)", () => {
  it("replaces patient wholesale", async () => {
    const { id } = await store.create({ patient: { age: 50, systolicBp: 120 } });
    const after = await store.put(id, { patient: { age: 60 }, previouslyMissing: [] });
    expect(after?.patient).toEqual({ age: 60 });
  });
});

describe("SessionStore — delete + list", () => {
  it("delete on a real id returns true and the session is gone", async () => {
    const { id } = await store.create();
    expect(await store.delete(id)).toBe(true);
    expect(await store.get(id)).toBeNull();
  });
  it("delete is idempotent (second call returns false)", async () => {
    const { id } = await store.create();
    expect(await store.delete(id)).toBe(true);
    expect(await store.delete(id)).toBe(false);
  });
  it("list returns existing sessions newest-first", async () => {
    const a = await store.create();
    await new Promise((r) => setTimeout(r, 5));
    const b = await store.create();
    const items = await store.list();
    expect(items.map((x) => x.id)).toEqual([b.id, a.id]);
  });
});

describe("SessionStore — TTL pruning", () => {
  it("get returns null and deletes a session past its TTL", async () => {
    const shortStore = new SessionStore({ dir, ttlMs: 10 });
    const { id } = await shortStore.create();
    await new Promise((r) => setTimeout(r, 25));
    expect(await shortStore.get(id)).toBeNull();
    // file should be gone
    expect(await shortStore.list()).toEqual([]);
  });
});

describe("SessionStore — corruption tolerance", () => {
  it("returns null and does not crash when the file is not JSON", async () => {
    const { id } = await store.create();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(dir, `${id}.json`), "{ this is not json");
    expect(await store.get(id)).toBeNull();
  });
});
