import { NextRequest, NextResponse } from "next/server";
import { signUp, login, logout } from "@/lib/auth";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "signup") {
      const data = await signUp(body.email, body.password, body.name);
      const needsEmailVerification = !data.session;

      return json({
        success: true,
        user: data.user,
        session: data.session,
        message: needsEmailVerification
          ? "Account created. Please verify your email before logging in."
          : "Account created successfully.",
      });
    }

    if (action === "login") {
      const data = await login(body.email, body.password);

      return json({
        success: true,
        user: data.user,
        session: data.session,
        message: "Login successful.",
      });
    }

    if (action === "logout") {
      await logout();
      return json({ success: true, message: "Logged out successfully." });
    }

    return json(
      { success: false, message: "Invalid authentication action." },
      400,
    );
  } catch (error) {
    console.error("Auth API error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Authentication request failed.";

    return json({ success: false, message }, 400);
  }
}
