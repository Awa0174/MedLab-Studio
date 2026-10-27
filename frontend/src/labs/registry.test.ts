import { describe, expect, it } from "vitest";
import { LABS, getLab, labPath } from "@/labs/registry";

describe("lab registry", () => {
  it("contains exactly ten labs numbered 1..10", () => {
    expect(LABS).toHaveLength(10);
    expect(LABS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("has unique ids and the ECG lab available", () => {
    expect(new Set(LABS.map((l) => l.id)).size).toBe(10);
    expect(getLab("ecg")?.status).toBe("available");
    expect(LABS.filter((l) => l.status === "planned")).toHaveLength(7);
  });

  it("builds lab routes", () => {
    expect(labPath({ id: "ecg" })).toBe("/labs/ecg");
    expect(getLab("does-not-exist")).toBeUndefined();
  });
});
