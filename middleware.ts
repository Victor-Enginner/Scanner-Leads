import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Protect admin routes: Redirect back to landing page if not admin
    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Authorized if user is logged in
    },
  }
);

// Define which routes are protected by this middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/solicitar/:path*",
    "/admin/:path*",
  ],
};
