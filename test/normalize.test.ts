import { describe, it, expect } from "vitest";
import { normalizeJobUrl } from "@/lib/scraper/normalize";

describe("URL Normalization & Hashing", () => {
  it("temizler ve UTM parametrelerini siler", () => {
    const raw =
      "https://www.kariyer.net/is-ilani/yazilim-uzmani-12345?utm_source=linkedin&utm_medium=cpc&trk=abc";
    const res = normalizeJobUrl(raw);

    expect(res.kaynakSite).toBe("kariyer.net");
    expect(res.normalizedUrl).toBe(
      "https://kariyer.net/is-ilani/yazilim-uzmani-12345"
    );
    expect(res.urlHash).toHaveLength(64); // SHA-256
  });

  it("LinkedIn ve Indeed sitelerini doğru tespit eder", () => {
    const li = normalizeJobUrl(
      "https://tr.linkedin.com/jobs/view/senior-developer-at-trendyol-123456?refId=xyz"
    );
    expect(li.kaynakSite).toBe("linkedin");
    expect(li.normalizedUrl).not.toContain("refId");

    const ind = normalizeJobUrl("https://tr.indeed.com/viewjob?jk=abcdef123456");
    expect(ind.kaynakSite).toBe("indeed");
  });

  it("aynı URL için deterministik urlHash üretir", () => {
    const url1 = "https://www.kariyer.net/is-ilani/ornek-123";
    const url2 = "https://kariyer.net/is-ilani/ornek-123?utm_campaign=brand";

    const res1 = normalizeJobUrl(url1);
    const res2 = normalizeJobUrl(url2);

    expect(res1.urlHash).toBe(res2.urlHash);
  });
});
