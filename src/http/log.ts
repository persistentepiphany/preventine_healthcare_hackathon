/**
 * Per-request line log. Goes to stderr so it doesn't pollute the JSON
 * responses on stdout. Disabled when LOG_REQUESTS=0 (useful in tests).
 */

export interface RequestLogFields {
  method: string;
  pathname: string;
  status: number;
  totalMs: number;
  mode?: string;
  cache?: "hit" | "miss" | "n/a";
}

export function logRequest(f: RequestLogFields): void {
  if (process.env.LOG_REQUESTS === "0") return;
  const parts = [
    new Date().toISOString(),
    f.method,
    f.pathname,
    String(f.status),
    `${f.totalMs}ms`,
  ];
  if (f.mode) parts.push(`mode=${f.mode}`);
  if (f.cache) parts.push(`cache=${f.cache}`);
  process.stderr.write(parts.join(" ") + "\n");
}
