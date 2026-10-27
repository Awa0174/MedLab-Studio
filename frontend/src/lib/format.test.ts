import { describe, expect, it } from "vitest";
import { fmt, shortHash } from "@/lib/format";

describe("format helpers", () => {
  it("formats numbers with units and handles missing values", () => {
    expect(fmt(72.3456, 1, "bpm")).toBe("72.3 bpm");
    expect(fmt(null)).toBe("–");
    expect(fmt(undefined, 2, "mV")).toBe("–");
    expect(fmt(Number.NaN)).toBe("–");
  });

  it("shortens hashes", () => {
    expect(shortHash("abcdef0123456789", 6)).toBe("abcdef");
    expect(shortHash(null)).toBe("–");
  });
});
