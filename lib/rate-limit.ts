import { db } from "./db";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  message?: string;
}

export async function checkRateLimit(
  reqHeaders: Headers,
  prefix = "llm"
): Promise<RateLimitResult> {
  const limit = parseInt(process.env.RATE_LIMIT_PER_MINUTE || "10", 10);

  // BYOK (Kendi API anahtarını getiren kullanıcılar) sunucu kotasını tüketmediği için rate limit'ten muaftır
  const cookieHeader = reqHeaders.get("cookie") || "";
  if (cookieHeader.includes("byok_key=") && !cookieHeader.includes("byok_key=;")) {
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: new Date(Date.now() + 60000),
    };
  }

  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0].trim() ||
    reqHeaders.get("x-real-ip") ||
    "127.0.0.1";

  const now = new Date();
  const minuteString = now.toISOString().substring(0, 16); // e.g. 2026-10-25T13:02
  const key = `${prefix}:${ip}:${minuteString}`;
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 dakika sonra silinebilir

  try {
    const record = await db.rateLimit.upsert({
      where: { key },
      update: {
        count: { increment: 1 },
      },
      create: {
        key,
        count: 1,
        expiresAt,
      },
    });

    if (record.count > limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: expiresAt,
        message:
          "İstek limitine ulaştınız. Lütfen bir dakika bekledikten sonra tekrar deneyiniz.",
      };
    }

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - record.count),
      reset: expiresAt,
    };
  } catch (error) {
    console.warn("Rate limit veritabanı kontrolü atlandı:", error);
    // Veritabanı erişilemiyorsa isteği engelleme (fail-open)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: expiresAt,
    };
  }
}
