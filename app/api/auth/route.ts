import { NextRequest, NextResponse } from "next/server";
import {
  signUp,
  login,
  logout,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const action = body?.action;

    if (action === "signup") {
      const result = await signUp(
        body.email,
        body.password,
        body.name
      );

      return NextResponse.json(result, {
        status: result.user ? 200 : 400,
      });
    }

    if (action === "login") {
      const result = await login(
        body.email,
        body.password
      );

      return NextResponse.json(result, {
        status: result.user ? 200 : 401,
      });
    }

    if (action === "logout") {
      const result = await logout();

      return NextResponse.json(result, {
        status: result ? 200 : 500,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid authentication action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Auth API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Authentication request failed.",
      },
      { status: 500 }
    );
  }
}