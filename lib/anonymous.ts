import { cookies, headers } from "next/headers";

export const ANONYMOUS_COOKIE_NAME = "anonymousId";

export async function getAnonymousId(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ANONYMOUS_COOKIE_NAME)?.value;
  if (fromCookie) {
    return fromCookie;
  }

  const headerList = await headers();
  const fromHeader = headerList.get("x-anonymous-id");
  if (fromHeader) {
    return fromHeader;
  }

  const newId = crypto.randomUUID();
  try {
    cookieStore.set({
      name: ANONYMOUS_COOKIE_NAME,
      value: newId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  } catch {
    // In ReadonlyHeaders / Server Component rendering contexts, set() may throw
  }

  return newId;
}

