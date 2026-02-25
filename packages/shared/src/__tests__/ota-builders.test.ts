import { describe, it, expect } from "vitest";
import {
  OTA_BUILDERS,
  OTA_LIST,
  calcCheckoutDate,
  normalizeUrl,
  mergeUrlParams,
  type SearchCondition,
  type SearchProfile,
} from "../index";

const BASE_CONDITION: SearchCondition = {
  checkinDate: "2026-06-01",
  nights: 1,
  rooms: 1,
  adultsPerRoom: 2,
};

// ---- helpers ----
function makeProfile(ota: string, baseUrl: string, extras?: Partial<SearchProfile>): SearchProfile {
  return {
    ota: ota as any,
    baseUrl,
    variableMappingJson: {},
    ...extras,
  };
}

function urlParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

// ---- calcCheckoutDate ----
describe("calcCheckoutDate", () => {
  it("adds 1 night", () => {
    expect(calcCheckoutDate("2026-06-01", 1)).toBe("2026-06-02");
  });

  it("adds multiple nights across month boundary", () => {
    expect(calcCheckoutDate("2026-06-30", 2)).toBe("2026-07-02");
  });
});

// ---- normalizeUrl ----
describe("normalizeUrl", () => {
  const testUrl = "https://example.com/search?a=1&b=2&c=3&track=xyz";

  it("keeps all params when no list", () => {
    const result = normalizeUrl(testUrl);
    const p = urlParams(result);
    expect(p.get("a")).toBe("1");
    expect(p.get("track")).toBe("xyz");
  });

  it("filters by allowlist", () => {
    const result = normalizeUrl(testUrl, ["a", "c"]);
    const p = urlParams(result);
    expect(p.get("a")).toBe("1");
    expect(p.get("c")).toBe("3");
    expect(p.has("b")).toBe(false);
    expect(p.has("track")).toBe(false);
  });

  it("filters by denylist", () => {
    const result = normalizeUrl(testUrl, null, ["track"]);
    const p = urlParams(result);
    expect(p.get("a")).toBe("1");
    expect(p.has("track")).toBe(false);
  });
});

// ---- mergeUrlParams ----
describe("mergeUrlParams", () => {
  it("overrides existing and adds new params", () => {
    const result = mergeUrlParams("https://example.com/s?a=1&b=2", { b: 99, c: 3 });
    const p = urlParams(result);
    expect(p.get("a")).toBe("1");
    expect(p.get("b")).toBe("99");
    expect(p.get("c")).toBe("3");
  });
});

// ---- 楽天トラベル ----
describe("rakuten builder", () => {
  const profile = makeProfile(
    "rakuten",
    "https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_dai=japan&f_chu=okinawa&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_hyoji=30&f_page=1",
  );

  it("sets checkin/checkout/rooms/adults", () => {
    const url = OTA_BUILDERS.rakuten.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("f_nen1")).toBe("2026");
    expect(p.get("f_tuki1")).toBe("6");
    expect(p.get("f_hi1")).toBe("1");
    expect(p.get("f_nen2")).toBe("2026");
    expect(p.get("f_tuki2")).toBe("6");
    expect(p.get("f_hi2")).toBe("2");
    expect(p.get("f_heya_su")).toBe("1");
    expect(p.get("f_otona_su")).toBe("2");
  });

  it("sets children to 0", () => {
    const url = OTA_BUILDERS.rakuten.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("f_s1")).toBe("0");
    expect(p.get("f_y4")).toBe("0");
  });

  it("preserves base_url params", () => {
    const url = OTA_BUILDERS.rakuten.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("f_chu")).toBe("okinawa");
    expect(p.get("f_sort")).toBe("hotel");
  });
});

// ---- じゃらん ----
describe("jalan builder", () => {
  const profile = makeProfile(
    "jalan",
    "https://www.jalan.net/okinawa/LRG_041500/?rootCd=04&distCd=01&screenId=UWW1402",
  );

  it("sets date/nights/adults/rooms/roomCrack", () => {
    const url = OTA_BUILDERS.jalan.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("stayYear")).toBe("2026");
    expect(p.get("stayMonth")).toBe("6");
    expect(p.get("stayDay")).toBe("1");
    expect(p.get("stayCount")).toBe("1");
    expect(p.get("adultNum")).toBe("2");
    expect(p.get("roomCount")).toBe("1");
    expect(p.get("roomCrack")).toBe("200000"); // 2 * 100000
  });

  it("preserves internal params from base_url", () => {
    const url = OTA_BUILDERS.jalan.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("rootCd")).toBe("04");
    expect(p.get("screenId")).toBe("UWW1402");
  });
});

// ---- 一休 ----
describe("ikyu builder", () => {
  const profile = makeProfile(
    "ikyu",
    "https://www.ikyu.com/okinawa/100047/",
  );

  it("sets cid/cod in YYYYMMDD format", () => {
    const url = OTA_BUILDERS.ikyu.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("cid")).toBe("20260601");
    expect(p.get("cod")).toBe("20260602");
    expect(p.get("lc")).toBe("1");
    expect(p.get("rc")).toBe("1");
    expect(p.get("ppc")).toBe("2");
  });
});

// ---- Expedia ----
describe("expedia builder", () => {
  const profile = makeProfile(
    "expedia",
    "https://www.expedia.co.jp/Hotel-Search?regionId=6054439&destination=Naha&sort=RECOMMENDED",
  );

  it("sets dates and total adults", () => {
    const cond = { ...BASE_CONDITION, rooms: 2, adultsPerRoom: 3 };
    const url = OTA_BUILDERS.expedia.buildUrl(cond, profile);
    const p = urlParams(url);
    expect(p.get("startDate")).toBe("2026-06-01");
    expect(p.get("endDate")).toBe("2026-06-02");
    expect(p.get("adults")).toBe("6"); // 3 * 2
    expect(p.get("rooms")).toBe("2");
    expect(p.get("d1")).toBe("2026-06-01");
    expect(p.get("d2")).toBe("2026-06-02");
  });
});

// ---- Booking.com ----
describe("booking builder", () => {
  const profile = makeProfile(
    "booking",
    "https://www.booking.com/searchresults.ja.html?dest_id=900040437&dest_type=city&ss=Naha",
  );

  it("sets dates and total adults", () => {
    const url = OTA_BUILDERS.booking.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("checkin")).toBe("2026-06-01");
    expect(p.get("checkout")).toBe("2026-06-02");
    expect(p.get("group_adults")).toBe("2"); // 2 * 1
    expect(p.get("group_children")).toBe("0");
    expect(p.get("no_rooms")).toBe("1");
  });

  it("preserves dest_id from base_url", () => {
    const url = OTA_BUILDERS.booking.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("dest_id")).toBe("900040437");
  });
});

// ---- Agoda ----
describe("agoda builder", () => {
  const profile = makeProfile(
    "agoda",
    "https://www.agoda.com/ja-jp/search?region=14613&textToSearch=Naha&currencyCode=JPY",
  );

  it("sets dates, los, total adults", () => {
    const cond = { ...BASE_CONDITION, nights: 3 };
    const url = OTA_BUILDERS.agoda.buildUrl(cond, profile);
    const p = urlParams(url);
    expect(p.get("checkIn")).toBe("2026-06-01");
    expect(p.get("checkOut")).toBe("2026-06-04");
    expect(p.get("los")).toBe("3");
    expect(p.get("adults")).toBe("2");
    expect(p.get("children")).toBe("0");
    expect(p.get("currencyCode")).toBe("JPY");
  });
});

// ---- Trip.com ----
describe("tripcom builder", () => {
  const profile = makeProfile(
    "tripcom",
    "https://jp.trip.com/hotels/list?searchType=S&searchValue=abc&searchWord=Naha&barCurr=JPY",
  );

  it("sets dates, crn, total adult", () => {
    const url = OTA_BUILDERS.tripcom.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("checkIn")).toBe("2026-06-01");
    expect(p.get("checkOut")).toBe("2026-06-02");
    expect(p.get("crn")).toBe("1");
    expect(p.get("adult")).toBe("2");
    expect(p.get("children")).toBe("0");
  });

  it("preserves searchType/searchValue as black box", () => {
    const url = OTA_BUILDERS.tripcom.buildUrl(BASE_CONDITION, profile);
    const p = urlParams(url);
    expect(p.get("searchType")).toBe("S");
    expect(p.get("searchValue")).toBe("abc");
  });
});

// ---- All builders produce valid URLs ----
describe("all builders produce valid URLs", () => {
  const profiles: Record<string, SearchProfile> = {
    rakuten: makeProfile("rakuten", "https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03"),
    jalan: makeProfile("jalan", "https://www.jalan.net/okinawa/LRG_041500/"),
    ikyu: makeProfile("ikyu", "https://www.ikyu.com/okinawa/100047/"),
    expedia: makeProfile("expedia", "https://www.expedia.co.jp/Hotel-Search?regionId=123"),
    booking: makeProfile("booking", "https://www.booking.com/searchresults.ja.html?dest_id=1"),
    agoda: makeProfile("agoda", "https://www.agoda.com/ja-jp/search?region=1"),
    tripcom: makeProfile("tripcom", "https://jp.trip.com/hotels/list?searchType=S"),
  };

  for (const ota of OTA_LIST) {
    it(`${ota}: produces parseable URL`, () => {
      const url = OTA_BUILDERS[ota].buildUrl(BASE_CONDITION, profiles[ota]!);
      expect(() => new URL(url)).not.toThrow();
    });
  }
});
