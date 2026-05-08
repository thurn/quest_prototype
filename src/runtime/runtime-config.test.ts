import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "./runtime-config";

describe("parseRuntimeConfig", () => {
  it("returns the default config when no params are present", () => {
    expect(parseRuntimeConfig("")).toEqual({
      seedOverride: null,
      startInBattle: false,
    });
  });

  describe("seedOverride", () => {
    it("returns the parsed integer when seed is a non-negative integer", () => {
      expect(parseRuntimeConfig("?seed=42").seedOverride).toBe(42);
      expect(parseRuntimeConfig("?seed=0").seedOverride).toBe(0);
      expect(parseRuntimeConfig("?seed=12345").seedOverride).toBe(12345);
    });

    it("rejects non-numeric, negative, or empty seed values", () => {
      expect(parseRuntimeConfig("?seed=foo").seedOverride).toBeNull();
      expect(parseRuntimeConfig("?seed=-5").seedOverride).toBeNull();
      expect(parseRuntimeConfig("?seed=").seedOverride).toBeNull();
      expect(parseRuntimeConfig("?seed=1.5").seedOverride).toBeNull();
      expect(parseRuntimeConfig("?seed=1e3").seedOverride).toBeNull();
    });
  });

  describe("startInBattle", () => {
    it("returns true when startInBattle=1", () => {
      expect(parseRuntimeConfig("?startInBattle=1").startInBattle).toBe(true);
    });

    it("returns false for non-1 values of startInBattle", () => {
      expect(parseRuntimeConfig("?startInBattle=0").startInBattle).toBe(false);
      expect(parseRuntimeConfig("?startInBattle=true").startInBattle).toBe(
        false,
      );
      expect(parseRuntimeConfig("?startInBattle=").startInBattle).toBe(false);
    });
  });
});
