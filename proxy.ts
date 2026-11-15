// A password on the whole site, so a public link can't be used by anyone who
// finds it: every visit to the site (and its API routes, which spend
// ElevenLabs and Claude credit) needs the password from SITE_PASSWORD.
// The browser shows its own sign-in box; any username works.
//
// Next.js 16 calls this file "proxy" (it was "middleware" before).

import { NextResponse, type NextRequest } from "next/server";

function askForPassword(message = "Password needed."): NextResponse {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="InterpretTime", charset="UTF-8"' },
  });
}

/** The password typed into the browser's sign-in box, or null. */
function typedPassword(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice("Basic ".length));
    const colon = decoded.indexOf(":");
    return colon === -1 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

/** Compares without stopping at the first different character. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) {
    // Fine on your own computer; never leave a hosted copy open by accident.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("This site is locked: SITE_PASSWORD is not set.", { status: 503 });
    }
    return NextResponse.next();
  }
  const typed = typedPassword(request);
  if (typed === null || !sameText(typed, password)) return askForPassword();
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js's own build files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
