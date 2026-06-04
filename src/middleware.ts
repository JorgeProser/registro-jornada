import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // SUPERADMIN only belongs in /superadmin
    if (token?.role === "SUPERADMIN" && !pathname.startsWith("/superadmin")) {
      return NextResponse.redirect(new URL("/superadmin", req.url));
    }
    // /superadmin is exclusive to SUPERADMIN
    if (pathname.startsWith("/superadmin") && token?.role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Role-based route guards for regular users
    if (pathname.startsWith("/admin") && token?.role === "EMPLOYEE") {
      return NextResponse.redirect(new URL("/employee", req.url));
    }
    if (pathname.startsWith("/inspector") && token?.role !== "INSPECTOR") {
      return NextResponse.redirect(new URL("/employee", req.url));
    }
    if (pathname.startsWith("/employee") && token?.role !== "EMPLOYEE" && token?.role !== "MANAGER") {
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
  matcher: ["/employee/:path*", "/admin/:path*", "/inspector/:path*", "/superadmin/:path*"],
};
