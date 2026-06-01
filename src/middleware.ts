import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Role-based route guards
    if (pathname.startsWith("/admin") && token?.role === "EMPLOYEE") {
      return NextResponse.redirect(new URL("/employee", req.url));
    }
    if (pathname.startsWith("/inspector") && token?.role !== "INSPECTOR") {
      return NextResponse.redirect(new URL("/employee", req.url));
    }
    if (pathname.startsWith("/employee") && token?.role !== "EMPLOYEE") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/employee/:path*", "/admin/:path*", "/inspector/:path*"],
};
