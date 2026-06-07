import type { IncomingMessage } from "node:http";
import { parsePatientInput, type PatientInput } from "../contracts/patient_input.js";

export interface UploadResult {
  ok: true;
  data: PatientInput;
}

export interface UploadError {
  ok: false;
  error: "invalid_format" | "validation_failed";
  issues?: { path: string; message: string }[];
}

export type UploadResponse = UploadResult | UploadError;

/**
 * Parse plain text file (key=value or key: value format)
 */
function parsePlainLines(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.trim().split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue; // Skip empty and comments

    // Try key=value
    let separator = trimmed.indexOf("=");
    let key: string | null = null;
    let value: string | null = null;

    if (separator !== -1) {
      key = trimmed.slice(0, separator).trim();
      value = trimmed.slice(separator + 1).trim();
    } else {
      // Try key: value
      separator = trimmed.indexOf(":");
      if (separator !== -1) {
        key = trimmed.slice(0, separator).trim();
        value = trimmed.slice(separator + 1).trim();
      }
    }

    if (key && value !== null) {
      result[key] = parseValue(value);
    }
  }

  return result;
}

/**
 * Convert string value to appropriate type
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;

  // String
  return value;
}

/**
 * Parse file content based on detected format
 */
function parseFileContent(content: string, filename: string): unknown {
  const trimmed = content.trim();

  // Try JSON first
  if (filename.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(content);
    } catch {
      // Not valid JSON, fall through to plain text
    }
  }

  // Plain text key=value format
  return parsePlainLines(content);
}

/**
 * Parse uploaded file and validate as PatientInput
 */
export function parseUploadedFile(content: string, filename: string): UploadResponse {
  try {
    const parsed = parseFileContent(content, filename);
    const validation = parsePatientInput(parsed);

    if (validation.ok) {
      return { ok: true, data: validation.value };
    } else {
      return { ok: false, error: "validation_failed", issues: validation.issues };
    }
  } catch {
    return { ok: false, error: "invalid_format" };
  }
}

/**
 * Extract file content from multipart/form-data request
 * Note: This is a simple parser. For production, use a library like multer.
 */
export async function extractMultipartFile(req: IncomingMessage): Promise<{ filename: string; content: string } | null> {
  const contentType = req.headers["content-type"];
  if (!contentType?.startsWith("multipart/form-data")) {
    return null;
  }

  return new Promise((resolve) => {
    let chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("binary");

      // Simple multipart parsing - extract filename and content
      // Format: boundary, headers, blank line, content, boundary
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) {
        resolve(null);
        return;
      }

      const boundary = boundaryMatch[1];
      const parts = body.split(`--${boundary}`);

      for (const part of parts) {
        if (!part.trim() || part === "--") continue;

        // Extract filename from Content-Disposition header
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (!filenameMatch) continue;

        const filename = filenameMatch[1];
        // Content is after the blank line following headers
        const contentStart = part.indexOf("\r\n\r\n");
        if (contentStart === -1) continue;

        // Content ends before the next boundary
        const content = part.slice(contentStart + 4).replace(/\r\n$/, "");

        resolve({ filename, content: content.toString() });
        return;
      }

      resolve(null);
    });

    req.on("error", () => {
      resolve(null);
    });
  });
}