import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/gate";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
