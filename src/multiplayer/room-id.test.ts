import { describe, expect, it } from "vitest";
import { generateRoomId, isValidRoomId, normalizeRoomId } from "./room-id";

describe("room ids", () => {
  it("generates lowercase share-safe ids", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
    expect(generateRoomId(() => bytes)).toBe("abcdef");
  });

  it("rejects generated room id lengths outside the valid range", () => {
    expect(() => generateRoomId(() => new Uint8Array(3), 3)).toThrow("Room id length must be between 4 and 24 characters.");
    expect(() => generateRoomId(() => new Uint8Array(25), 25)).toThrow("Room id length must be between 4 and 24 characters.");
  });

  it("accepts only 4 to 24 lowercase letters and digits", () => {
    expect(isValidRoomId("ab12")).toBe(true);
    expect(isValidRoomId("questroom123")).toBe(true);
    expect(isValidRoomId("ABC")).toBe(false);
    expect(isValidRoomId("abc")).toBe(false);
    expect(isValidRoomId("abc_def")).toBe(false);
  });

  it("normalizes user supplied ids", () => {
    expect(normalizeRoomId(" QuestRoom123 ")).toBe("questroom123");
    expect(normalizeRoomId("bad id")).toBeNull();
  });
});
