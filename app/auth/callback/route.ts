import { NextResponse, type NextRequest } from "next/server";
import { getAbsoluteSiteUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(next, getAbsoluteSiteUrl());

  console.info("[auth:callback] handling callback", {
    hasCode: Boolean(code),
    next,
    redirectTo: redirectUrl.toString(),
  });

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth:callback] exchangeCodeForSession failed", {
        message: error.message,
        status: error.status,
      });
      const loginUrl = new URL("/login", getAbsoluteSiteUrl());
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
