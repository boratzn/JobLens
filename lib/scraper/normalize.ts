import crypto from "crypto";

export interface NormalizedUrlResult {
  normalizedUrl: string;
  urlHash: string;
  kaynakSite: string;
}

export function normalizeJobUrl(rawUrl: string): NormalizedUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Geçerli bir web adresi (URL) giriniz.");
  }

  // Protokolü https yap ve www'yi temizle
  parsed.protocol = "https:";
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const hostname = parsed.hostname;

  // İzleme ve reklam parametrelerini temizle
  const paramsToDelete: string[] = [];
  parsed.searchParams.forEach((_, key) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.startsWith("utm_") ||
      [
        "trk",
        "trkn",
        "refid",
        "refcode",
        "midtoken",
        "currentjobid",
        "trackingid",
        "position",
        "pagenum",
        "origin",
        "fbclid",
        "gclid",
        "_ga",
      ].includes(lowerKey)
    ) {
      paramsToDelete.push(key);
    }
  });

  paramsToDelete.forEach((key) => parsed.searchParams.delete(key));

  // Trailing slash temizliği
  let cleanUrl = parsed.toString().replace(/\/+$/, "");

  // Kaynak site tespiti
  let kaynakSite = "generic";
  if (hostname.includes("kariyer.net")) {
    kaynakSite = "kariyer.net";
  } else if (hostname.includes("linkedin.com")) {
    kaynakSite = "linkedin";
  } else if (hostname.includes("indeed.")) {
    kaynakSite = "indeed";
  } else if (hostname.includes("secretcv.com")) {
    kaynakSite = "secretcv";
  } else if (hostname.includes("yenibiris.com")) {
    kaynakSite = "yenibiris";
  }

  const urlHash = crypto.createHash("sha256").update(cleanUrl).digest("hex");

  return {
    normalizedUrl: cleanUrl,
    urlHash,
    kaynakSite,
  };
}
