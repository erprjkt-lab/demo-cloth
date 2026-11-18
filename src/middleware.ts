import { NextResponse, type NextRequest } from "next/server";

// Cheap gate only: real role and ownership checks live in requireUser().
export function middleware(req: NextRequest) {
  if (!req.cookies.has("jc_session")) return NextResponse.redirect(new URL("/login", req.url));
}

// Public: login, PWA files (fetched without cookies) and the cron endpoint (has its own secret).
export const config = {
  matcher: ["/((?!login|api/cron|manifest.webmanifest|sw.js|icon|apple-icon|_next/static|_next/image|favicon.ico).*)"],
};
