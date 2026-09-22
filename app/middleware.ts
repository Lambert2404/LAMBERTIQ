export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/documents/:path*", "/quizzes/:path*", "/study-planner/:path*"]
};