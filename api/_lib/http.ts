// Small request helpers the Vercel functions share. Folders starting with _ are not functions.
// They stand in for what Next.js gave the old route handlers (NextRequest.cookies,
// NextResponse.cookies.set) so the functions keep the same behaviour.

/** The visitor's address as Vercel reports it, for rate limits. */
export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** One cookie from the request's Cookie header. */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

/** The session cookie the Lucy routes set: HttpOnly, one hour, same-site only. */
export function sessionCookie(name: string, value: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=3600; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}
