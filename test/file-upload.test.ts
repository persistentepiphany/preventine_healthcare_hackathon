import { describe, it, expect } from "vitest";
import { parseUploadedFile } from "../src/http/file-upload.js";

describe("file-upload", () => {
  const requiredFields = {
    age: 45,
    livesInEngland: true,
    hasCvd: false,
    hasChronicKidneyDisease: false,
    hasDiabetes: false,
    hasHypertension: false,
    hasAtrialFibrillation: false,
    hasStrokeOrTia: false,
    hasFamilialHypercholesterolaemia: false,
    hasHeartFailure: false,
    hasPeripheralArterialDisease: false,
    onStatins: false,
    previousHighCvdRisk: false,
    chestPain: false,
    strokeSymptoms: false,
    severeBreathlessness: false,
    bpCheckedLast6Months: true,
  };

  describe("parseUploadedFile", () => {
    it("parses valid JSON file", () => {
      const json = JSON.stringify(requiredFields);

      const result = parseUploadedFile(json, "test.json");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.age).toBe(45);
        expect(result.data.livesInEngland).toBe(true);
      }
    });

    it("parses plain text key=value format", () => {
      const text = Object.entries(requiredFields)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");

      const result = parseUploadedFile(text, "test.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.age).toBe(45);
        expect(result.data.livesInEngland).toBe(true);
      }
    });

    it("parses plain text key: value format", () => {
      const text = Object.entries(requiredFields)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      const result = parseUploadedFile(text, "test.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.age).toBe(45);
        expect(result.data.livesInEngland).toBe(true);
      }
    });

    it("handles missing optional fields", () => {
      const json = JSON.stringify(requiredFields);

      const result = parseUploadedFile(json, "test.json");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.systolicBp).toBeUndefined();
        expect(result.data.diastolicBp).toBeUndefined();
        expect(result.data.smokingStatus).toBeUndefined();
      }
    });

    it("returns validation error for invalid data", () => {
      const json = JSON.stringify({
        age: "not a number",
        livesInEngland: "not a boolean",
        ...Object.fromEntries(
          Object.entries(requiredFields).filter(([k]) => k !== "age" && k !== "livesInEngland")
        ),
      });

      const result = parseUploadedFile(json, "test.json");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("validation_failed");
        expect(result.issues).toBeDefined();
        expect(result.issues?.length).toBeGreaterThan(0);
      }
    });

    it("returns validation error for missing required fields", () => {
      const json = JSON.stringify({
        age: 45,
        livesInEngland: true,
        // Missing all required boolean fields
      });

      const result = parseUploadedFile(json, "test.json");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("validation_failed");
        expect(result.issues).toBeDefined();
      }
    });

    it("handles comments and blank lines in plain text", () => {
      const text = Object.entries(requiredFields)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
        .replace(/^age=/m, "# This is a comment\nage=")
        .replace(/^livesInEngland=/m, "\nlivesInEngland=")
        .replace(/^hasCvd=/m, "\n# Another comment\nhasCvd=");

      const result = parseUploadedFile(text, "test.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.age).toBe(45);
      }
    });

    it("converts string booleans correctly", () => {
      const text = Object.entries(requiredFields)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");

      const result = parseUploadedFile(text, "test.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.data.livesInEngland).toBe("boolean");
        expect(result.data.livesInEngland).toBe(true);
        expect(result.data.hasCvd).toBe(false);
      }
    });

    it("converts string numbers correctly", () => {
      const text = Object.entries(requiredFields)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") +
        "\nsystolicBp=120\n" +
        "diastolicBp=80";

      const result = parseUploadedFile(text, "test.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.data.systolicBp).toBe("number");
        expect(result.data.systolicBp).toBe(120);
        expect(result.data.diastolicBp).toBe(80);
      }
    });
  });
});