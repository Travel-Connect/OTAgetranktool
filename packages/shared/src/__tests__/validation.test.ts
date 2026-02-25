import { describe, it, expect } from "vitest";
import { validateSearchCondition, type SearchCondition } from "../index";

const VALID: SearchCondition = {
  checkinDate: "2026-06-01",
  nights: 1,
  rooms: 1,
  adultsPerRoom: 2,
};

describe("validateSearchCondition", () => {
  it("returns no errors for valid input", () => {
    expect(validateSearchCondition(VALID)).toEqual([]);
  });

  it("rejects invalid date format", () => {
    const errors = validateSearchCondition({ ...VALID, checkinDate: "2026/6/1" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("checkinDate");
  });

  it("rejects nights < 1", () => {
    const errors = validateSearchCondition({ ...VALID, nights: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("nights");
  });

  it("rejects rooms < 1", () => {
    const errors = validateSearchCondition({ ...VALID, rooms: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("rooms");
  });

  it("rejects adultsPerRoom < 1", () => {
    const errors = validateSearchCondition({ ...VALID, adultsPerRoom: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("adultsPerRoom");
  });

  it("rejects non-integer nights", () => {
    const errors = validateSearchCondition({ ...VALID, nights: 1.5 });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe("nights");
  });

  it("accepts multi-night stays", () => {
    expect(validateSearchCondition({ ...VALID, nights: 14 })).toEqual([]);
  });

  it("accepts large party sizes", () => {
    expect(validateSearchCondition({ ...VALID, rooms: 5, adultsPerRoom: 4 })).toEqual([]);
  });
});
