import type { IncomingMessage } from "node:http";
import { parsePatientInput, type PatientInput } from "../contracts/patient_input.js";

export interface UploadResult {
  ok: true;
  data: PatientInput;
}

export interface UploadError {
  ok: false;
  error: "invalid_format" | "validation_failed" | "pdf_parse_failed" | "no_file";
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
    if (!trimmed || trimmed.startsWith("#")) continue;

    let separator = trimmed.indexOf("=");
    let key: string | null = null;
    let value: string | null = null;

    if (separator !== -1) {
      key = trimmed.slice(0, separator).trim();
      value = trimmed.slice(separator + 1).trim();
    } else {
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
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;

  return value;
}

/**
 * Parse PDF file and extract text
 */
async function parsePdf(content: Buffer): Promise<string | null> {
  try {
    const pdfparse = (await import("pdf-parse")).default;
    const data = await pdfparse(content);
    return data.text;
  } catch {
    return null;
  }
}

/**
 * Parse file content based on detected format
 */
async function parseFileContent(content: Buffer, filename: string): Promise<unknown> {
  const trimmed = content.toString("utf-8").trim();

  if (filename.toLowerCase().endsWith(".pdf")) {
    const text = await parsePdf(content);
    if (!text) throw new Error("Failed to parse PDF");
    return parsePlainLines(text);
  }

  if (filename.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  return parsePlainLines(trimmed);
}

/**
 * Parse uploaded file and validate as PatientInput
 */
export async function parseUploadedFile(content: Buffer, filename: string): Promise<UploadResponse> {
  try {
    const parsed = await parseFileContent(content, filename);
    const validation = parsePatientInput(parsed);

    if (validation.ok) {
      return { ok: true, data: validation.value };
    } else {
      return { ok: false, error: "validation_failed", issues: validation.issues };
    }
  } catch {
    if (filename.toLowerCase().endsWith(".pdf")) {
      return { ok: false, error: "pdf_parse_failed" };
    }
    return { ok: false, error: "invalid_format" };
  }
}

/**
 * Extract file from multipart/form-data request using busboy
 */
export async function extractMultipartFile(req: IncomingMessage): Promise<{ filename: string; content: Buffer } | null> {
  const contentType = req.headers["content-type"];
  if (!contentType?.startsWith("multipart/form-data")) {
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const Busboy = require("busboy");
      const busboy = Busboy({ headers: req.headers });

      let filename: string | null = null;
      let fileContent: Buffer[] = [];

      busboy.on("file", (fieldname, file, info) => {
        filename = info.filename;
        file.on("data", (data) => {
          fileContent.push(data);
        });
        file.on("end", () => {
          resolve({ filename: filename, content: Buffer.concat(fileContent) });
        });
      });

      busboy.on("finish", () => {
        if (filename === null) {
          resolve(null);
        }
      });

      busboy.on("error", (err) => {
        resolve(null);
      });

      req.pipe(busboy);
    } catch {
      // busboy not installed - fall back to simple parser
      resolve(null);
    }
  });
}