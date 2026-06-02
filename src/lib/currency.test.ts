import { describe, expect, it } from "vitest";
import { formatCurrencyInput, parseCurrencyToCents } from "./currency";

describe("parseCurrencyToCents", () => {
  it("keeps only digits and returns cents", () => {
    expect(parseCurrencyToCents("R$ 12,34")).toBe(1234);
    expect(parseCurrencyToCents("20")).toBe(20);
  });

  it("returns undefined for empty values", () => {
    expect(parseCurrencyToCents("")).toBeUndefined();
    expect(parseCurrencyToCents("R$ ")).toBeUndefined();
  });
});

describe("formatCurrencyInput", () => {
  it("formats cents as BRL currency", () => {
    expect(formatCurrencyInput(1234)).toBe("R$ 12,34");
  });

  it("returns an empty string for absent or invalid numbers", () => {
    expect(formatCurrencyInput(null)).toBe("");
    expect(formatCurrencyInput(undefined)).toBe("");
    expect(formatCurrencyInput(Number.NaN)).toBe("");
  });
});
