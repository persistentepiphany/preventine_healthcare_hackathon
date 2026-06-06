import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/http/server.js";
import { AddressInfo } from "node:net";
import type { Server } from "node:http";

/**
 * CORS smoke tests for the dep-free node:http server. The UI is a downloaded
 * Claude Design artifact running on a different origin (file://, localhost on a
 * different port, or a tunnel hostname). Without CORS handling, every POST
 * from the UI would fail preflight. These tests cover the contract:
 *
 *  - OPTIONS preflight gets 204 + Access-Control-Allow-* headers
 *  - GET/POST responses carry Access-Control-Allow-Origin echoing the request Origin
 *  - When CORS_ORIGINS is an allowlist, non-listed origins get 403 on preflight
 *  - When no Origin is sent (curl, server-to-server), default policy returns "*"
 */

let server: Server;
let url: string;

function startServer(env: Record<string, string | undefined> = {}): Promise<void> {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return new Promise<void>((resolve) => {
    server = createApp();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      url = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

function stopServer(): Promise<void> {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

describe("CORS — default (permissive) policy", () => {
  beforeEach(async () => {
    await startServer({ CORS_ORIGINS: undefined });
  });
  afterEach(async () => {
    await stopServer();
  });

  it("OPTIONS preflight from any origin → 204 with Allow-Origin echoing the request Origin", async () => {
    const res = await fetch(`${url}/api/nhs/profile`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-methods")).toBe(
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    expect(res.headers.get("access-control-allow-headers")).toBe("content-type");
    expect(res.headers.get("vary")).toBe("Origin");
  });
  it("GET response carries Allow-Origin echoing Origin", async () => {
    const res = await fetch(`${url}/api/nhs/postcode?postcode=M13%209PL`, {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
  it("request with no Origin (curl-style) → wildcard ACAO", async () => {
    const res = await fetch(`${url}/api/nhs/postcode?postcode=M13%209PL`);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("CORS — allowlist policy", () => {
  beforeEach(async () => {
    await startServer({ CORS_ORIGINS: "http://localhost:5173,https://example.com" });
  });
  afterEach(async () => {
    await stopServer();
  });

  it("listed origin gets 204 + ACAO header on preflight", async () => {
    const res = await fetch(`${url}/api/nhs/profile`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
  it("non-listed origin gets 403 on preflight", async () => {
    const res = await fetch(`${url}/api/nhs/profile`, {
      method: "OPTIONS",
      headers: { Origin: "http://malicious.example" },
    });
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("non-listed origin POST has no ACAO header (browser will block)", async () => {
    const res = await fetch(`${url}/api/nhs/postcode?postcode=M13%209PL`, {
      headers: { Origin: "http://malicious.example" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
