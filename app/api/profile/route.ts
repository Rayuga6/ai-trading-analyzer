import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
} from "@/lib/database";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const profile = await getUserProfile();

    return NextResponse.json({
      success: true,
      profile: profile ?? {
        id: user.id,
        name: user.user_metadata?.name ?? "",
        email: user.email ?? "",
        avatar_url: null,
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load profile.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : undefined;

    const avatarUrl =
      typeof body.avatar_url === "string"
        ? body.avatar_url.trim()
        : undefined;

    if (name !== undefined && name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is too long.",
        },
        { status: 400 }
      );
    }

    const profile = await updateUserProfile({
      name,
      email: user.email ?? null,
      avatar_url: avatarUrl || null,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile,
    });
  } catch (error) {
    console.error("Profile PUT error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update profile.",
      },
      { status: 500 }
    );
  }
}