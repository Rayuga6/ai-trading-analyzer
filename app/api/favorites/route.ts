import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getFavorites,
  addFavorite,
  removeFavorite,
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

    const favorites = await getFavorites();

    return NextResponse.json({
      success: true,
      favorites,
    });
  } catch (error) {
    console.error("Favorites GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load favorites.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const market =
      typeof body?.market === "string"
        ? body.market.trim()
        : "";

    const symbol =
      typeof body?.symbol === "string"
        ? body.symbol.trim().toUpperCase()
        : "";

    if (!market || !symbol) {
      return NextResponse.json(
        {
          success: false,
          message: "Market and symbol are required.",
        },
        { status: 400 }
      );
    }

    const favorite = await addFavorite(
      market,
      symbol
    );

    return NextResponse.json({
      success: true,
      message: "Market added to favorites.",
      favorite,
    });
  } catch (error) {
    console.error("Favorites POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add favorite.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
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

    const { searchParams } =
      new URL(request.url);

    const market =
      searchParams.get("market")?.trim() || "";

    const symbol =
      searchParams.get("symbol")?.trim().toUpperCase() ||
      "";

    if (!market || !symbol) {
      return NextResponse.json(
        {
          success: false,
          message: "Market and symbol are required.",
        },
        { status: 400 }
      );
    }

    await removeFavorite(
      market,
      symbol
    );

    return NextResponse.json({
      success: true,
      message: "Market removed from favorites.",
    });
  } catch (error) {
    console.error(
      "Favorites DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to remove favorite.",
      },
      { status: 500 }
    );
  }
}