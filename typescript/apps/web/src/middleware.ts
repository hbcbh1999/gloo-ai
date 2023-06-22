import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  afterAuth(auth, req, _evt) {
    // handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);

      signInUrl.searchParams.set("redirect_url", req.url);

      return NextResponse.redirect(signInUrl);
    }

    // rededirect them to organization creation page if no org
    if (
      auth.userId &&
      !auth.orgId &&
      req.nextUrl.pathname !== "/create-organization"
    ) {
      const createOrgPage = new URL("/create-organization", req.url);

      return NextResponse.redirect(createOrgPage);
    }
  },

  publicRoutes: ["/", "/sign-in", "/sign-up"],
});
// Stop Middleware running on static files
export const config = {
  //matcher: "/((?!_next/image|_next/static|favicon.ico).*)",
  // matcher: "/",
  matcher: [
    /*

     * Match all request paths except for the ones starting with:

     * - _next

     * - static (static files)

     * - favicon.ico (favicon file)

     */

    // "/(.*?trpc.*?|(?!static|.*\\..*|_next|favicon.ico).*)",
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
