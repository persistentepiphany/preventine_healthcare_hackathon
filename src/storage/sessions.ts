/**
 * File-backed session store.
 *
 * Stores one JSON file per session under data/sessions/<id>.json. No DB
 * driver, no Supabase, no migrations — local-demo storage that survives a
 * server restart and lets the UI persist a patient draft across page
 * reloads.
 *
 * Design constraints
 * ------------------
 *   - Dep-free. node:fs / node:crypto only.
 *   - Atomic writes. Write to <id>.json.tmp, fsync, rename — so a crashed
 *     write never leaves a half-written JSON file the next read would parse
 *     into garbage.
 *   - UUID-shaped ids only. Validated at the storage boundary so a hostile
 *     `../../etc/passwd` id can't traverse out of the sessions dir.
 *   - TTL prune on read. A session older than SESSION_TTL_MS is deleted and
 *     treated as not-found. Defaults to 24 hours — appropriate for a demo;
 *     bump via SESSION_TTL_MS env if the team wants longer-lived drafts.
 *
 * Safety
 * ------
 *   Patient data is sensitive. The store is file-only, unencrypted, on the
 *   demo machine. This is fine for a hackathon laptop; do NOT use it as-is
 *   for any real patient data. Add the sessions dir to .gitignore so we
 *   never accidentally commit one.
 */
import { promises as fs } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { PatientInput } from "../contracts/patient_input.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIR = join(__dirname, "..", "..", "data", "sessions");

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The persistent shape a session holds. `patient` is the seam PatientInput
 * shape; ALL fields the patient has filled in so far. `postcode` is
 * optional. `previouslyMissing` is the snapshot of `missing_measurements`
 * the last time the UI rendered the profile — used by
 * /api/nhs/unlock-narration to compute what the patient just unlocked.
 */
export interface SessionData {
  patient: Partial<PatientInput>;
  postcode?: string;
  previouslyMissing: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A new session starts empty; the patient fills it in via PATCH/PUT.
 */
function emptySession(): SessionData {
  const now = new Date().toISOString();
  return {
    patient: {},
    previouslyMissing: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface StoreOptions {
  /** Override the storage dir (tests use a tmp dir). */
  dir?: string;
  /** Override the TTL in ms. */
  ttlMs?: number;
  /** Override the soft cap on stored session count. */
  maxSessions?: number;
}

export function isValidSessionId(id: string): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

export class SessionStore {
  private readonly dir: string;
  private readonly ttlMs: number;
  private readonly maxSessions: number;

  constructor(options: StoreOptions = {}) {
    this.dir = options.dir ?? DEFAULT_DIR;
    this.ttlMs = options.ttlMs ?? Number(process.env.SESSION_TTL_MS ?? DEFAULT_TTL_MS);
    this.maxSessions =
      options.maxSessions ?? Number(process.env.SESSION_MAX_COUNT ?? DEFAULT_MAX_SESSIONS);
  }

  /**
   * Build the on-disk path for an id. Defends against path traversal by
   * (1) rejecting non-UUID ids and (2) normalising and re-checking the
   * resolved path stays under our dir.
   */
  private pathFor(id: string): string {
    if (!isValidSessionId(id)) {
      throw new Error(`invalid session id: ${id}`);
    }
    const p = normalize(join(this.dir, `${id}.json`));
    if (!p.startsWith(this.dir)) {
      throw new Error(`session id resolved outside storage dir: ${id}`);
    }
    return p;
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  /**
   * Create a new session with a fresh UUID. Returns the id and the
   * initial data. Optionally pre-populates fields if the UI already has
   * something to save on first contact.
   */
  async create(seed: Partial<SessionData> = {}): Promise<{ id: string; data: SessionData }> {
    await this.ensureDir();
    await this.prune();
    const id = randomUUID();
    const data: SessionData = { ...emptySession(), ...seed };
    // Re-stamp times so the caller's seed can't manufacture an ancient
    // updatedAt that would trip TTL on first read.
    const now = new Date().toISOString();
    data.createdAt = now;
    data.updatedAt = now;
    await this.atomicWrite(id, data);
    return { id, data };
  }

  /**
   * Read a session by id. Returns null if not found OR if the session is
   * past its TTL (and deletes the stale file in the latter case).
   */
  async get(id: string): Promise<SessionData | null> {
    if (!isValidSessionId(id)) return null;
    const path = this.pathFor(id);
    let raw: string;
    try {
      raw = await fs.readFile(path, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
    let parsed: SessionData;
    try {
      parsed = JSON.parse(raw) as SessionData;
    } catch {
      // Corrupt file — treat as missing, don't crash the demo.
      return null;
    }
    if (this.isExpired(parsed)) {
      await fs.rm(path, { force: true });
      return null;
    }
    return parsed;
  }

  /**
   * Replace a session's contents. Useful for PUT semantics where the UI
   * holds the canonical draft and writes it whole.
   */
  async put(id: string, data: Omit<SessionData, "createdAt" | "updatedAt"> & Partial<Pick<SessionData, "createdAt">>): Promise<SessionData | null> {
    if (!isValidSessionId(id)) return null;
    const existing = await this.get(id);
    if (!existing) return null;
    const next: SessionData = {
      patient: data.patient,
      previouslyMissing: data.previouslyMissing,
      ...(data.postcode !== undefined ? { postcode: data.postcode } : {}),
      createdAt: data.createdAt ?? existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await this.atomicWrite(id, next);
    return next;
  }

  /**
   * Shallow-merge a partial update into an existing session. The `patient`
   * subobject is merged one level deep — i.e. PATCH { patient: { age: 50 }}
   * leaves the rest of the patient's fields intact.
   */
  async patch(id: string, partial: Partial<Omit<SessionData, "createdAt" | "updatedAt">>): Promise<SessionData | null> {
    if (!isValidSessionId(id)) return null;
    const existing = await this.get(id);
    if (!existing) return null;
    const next: SessionData = {
      patient: { ...existing.patient, ...(partial.patient ?? {}) },
      previouslyMissing: partial.previouslyMissing ?? existing.previouslyMissing,
      ...(partial.postcode !== undefined
        ? { postcode: partial.postcode }
        : existing.postcode !== undefined
          ? { postcode: existing.postcode }
          : {}),
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await this.atomicWrite(id, next);
    return next;
  }

  /**
   * Delete a session. Returns true if a file was removed. Idempotent.
   */
  async delete(id: string): Promise<boolean> {
    if (!isValidSessionId(id)) return false;
    const path = this.pathFor(id);
    try {
      await fs.rm(path);
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw e;
    }
  }

  /**
   * List session ids + their updatedAt timestamps, newest first.
   * Lightweight directory listing; doesn't read every file.
   */
  async list(): Promise<{ id: string; updatedAt: string }[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
    const out: { id: string; updatedAt: string }[] = [];
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const id = name.slice(0, -5);
      if (!isValidSessionId(id)) continue;
      const session = await this.get(id);
      if (!session) continue;
      out.push({ id, updatedAt: session.updatedAt });
    }
    out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
    return out;
  }

  /**
   * Sweep the store. Called from create() to keep things bounded:
   *   - delete sessions past TTL
   *   - if still over maxSessions, delete the oldest until under cap
   */
  async prune(): Promise<{ expired: number; trimmed: number }> {
    let expired = 0;
    let trimmed = 0;
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { expired: 0, trimmed: 0 };
      throw e;
    }
    const survivors: { id: string; updatedAt: string }[] = [];
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const id = name.slice(0, -5);
      if (!isValidSessionId(id)) continue;
      const path = join(this.dir, name);
      let raw: string;
      try {
        raw = await fs.readFile(path, "utf8");
      } catch {
        continue;
      }
      let parsed: SessionData;
      try {
        parsed = JSON.parse(raw) as SessionData;
      } catch {
        await fs.rm(path, { force: true });
        expired++;
        continue;
      }
      if (this.isExpired(parsed)) {
        await fs.rm(path, { force: true });
        expired++;
        continue;
      }
      survivors.push({ id, updatedAt: parsed.updatedAt });
    }
    if (survivors.length > this.maxSessions) {
      survivors.sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1));
      const overflow = survivors.length - this.maxSessions;
      for (let i = 0; i < overflow; i++) {
        const oldest = survivors[i];
        if (!oldest) continue;
        await fs.rm(this.pathFor(oldest.id), { force: true });
        trimmed++;
      }
    }
    return { expired, trimmed };
  }

  private isExpired(data: SessionData): boolean {
    if (this.ttlMs <= 0) return false;
    const updated = Date.parse(data.updatedAt);
    if (Number.isNaN(updated)) return true;
    return Date.now() - updated > this.ttlMs;
  }

  /**
   * Atomic write: temp file → fsync → rename. If the demo machine crashes
   * mid-write we either still see the old file or the new file, never a
   * truncated half-file.
   */
  private async atomicWrite(id: string, data: SessionData): Promise<void> {
    const path = this.pathFor(id);
    const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
    const handle = await fs.open(tmp, "w");
    try {
      await handle.writeFile(JSON.stringify(data, null, 2), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, path);
  }
}

/**
 * Module-level default store. Tests pass their own.
 */
let defaultStore: SessionStore | null = null;
export function getDefaultStore(): SessionStore {
  if (!defaultStore) defaultStore = new SessionStore();
  return defaultStore;
}
/** For tests that need to reset the default. */
export function _resetDefaultStore(): void {
  defaultStore = null;
}
