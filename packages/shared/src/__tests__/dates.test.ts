import { describe, it, expect } from "vitest";
import {
  formatDate,
  parseDate,
  addMonths,
  addDays,
  generateDates,
  isJpHoliday,
  WEEKDAYS_MON_FRI,
  type DateRule,
} from "../dates";

describe("formatDate / parseDate", () => {
  it("round-trips correctly", () => {
    const s = "2026-04-15";
    expect(formatDate(parseDate(s))).toBe(s);
  });

  it("zero-pads month and day", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addMonths", () => {
  it("adds months normally", () => {
    const d = parseDate("2026-02-25");
    expect(formatDate(addMonths(d, 2))).toBe("2026-04-25");
  });

  it("clamps to end of month", () => {
    const d = parseDate("2026-01-31");
    expect(formatDate(addMonths(d, 1))).toBe("2026-02-28");
  });
});

describe("addDays", () => {
  it("adds days across month boundary", () => {
    const d = parseDate("2026-04-30");
    expect(formatDate(addDays(d, 1))).toBe("2026-05-01");
  });
});

describe("isJpHoliday", () => {
  it("detects 昭和の日 (4/29)", () => {
    expect(isJpHoliday(parseDate("2026-04-29"))).toBe(true);
  });

  it("detects 元日 (1/1)", () => {
    expect(isJpHoliday(parseDate("2026-01-01"))).toBe(true);
  });

  it("normal weekday is not a holiday", () => {
    // 2026-04-15 is a Wednesday, not a holiday
    expect(isJpHoliday(parseDate("2026-04-15"))).toBe(false);
  });
});

describe("generateDates", () => {
  const rule: DateRule = {
    offsetMonths: 2,
    weekdays: WEEKDAYS_MON_FRI,
    excludeJpHolidays: true,
    generateCount: 5,
  };

  it("generates the requested count", () => {
    const dates = generateDates("2026-02-25", rule);
    expect(dates).toHaveLength(5);
  });

  it("all dates are weekdays (Mon-Fri)", () => {
    const dates = generateDates("2026-02-25", rule);
    for (const d of dates) {
      const dow = parseDate(d).getDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    }
  });

  it("excludes Japanese holidays", () => {
    const dates = generateDates("2026-02-25", rule);
    for (const d of dates) {
      expect(isJpHoliday(parseDate(d))).toBe(false);
    }
  });

  it("dates are in ascending order", () => {
    const dates = generateDates("2026-02-25", rule);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]! > dates[i - 1]!).toBe(true);
    }
  });

  it("starts from runDate + offsetMonths", () => {
    const dates = generateDates("2026-02-25", rule);
    // 2026-02-25 + 2months = 2026-04-25 (Sat) → first weekday = 2026-04-27 (Mon)
    expect(dates[0]).toBe("2026-04-27");
  });

  it("excludes 昭和の日 (2026-04-29 Wed)", () => {
    // 4/29 is 昭和の日 and falls on a Wednesday in 2026
    const dates = generateDates("2026-02-25", rule);
    expect(dates).not.toContain("2026-04-29");
  });

  it("works with generateCount=20", () => {
    const bigRule: DateRule = { ...rule, generateCount: 20 };
    const dates = generateDates("2026-02-25", bigRule);
    expect(dates).toHaveLength(20);
  });
});
