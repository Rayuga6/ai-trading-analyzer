import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getTraderSettings,
  updateTraderSettings,
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

    const settings = await getTraderSettings();

    return NextResponse.json({
      success: true,
      settings: settings ?? {
        user_id: user.id,
        default_market: "Crypto",
        default_symbol: "BTCUSDT",
        default_timeframe: "15m",
        trading_style: "Intraday",
        risk_level: "Medium",
        language: "English",
        notifications_enabled: true,
      },
    });
  } catch (error) {
    console.error("Settings GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load settings.",
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

    const allowedMarkets = [
      "Crypto",
      "Indian Market",
      "Forex",
      "Global Stocks",
    ];

    const allowedTimeframes = [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
    ];

    const allowedStyles = [
      "Scalping",
      "Intraday",
      "Swing",
    ];

    const allowedRiskLevels = [
      "Low",
      "Medium",
      "High",
    ];

    const settings: Record<string, unknown> = {};

    if (body.default_market !== undefined) {
      if (!allowedMarkets.includes(body.default_market)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid default market.",
          },
          { status: 400 }
        );
      }

      settings.default_market = body.default_market;
    }

    if (body.default_symbol !== undefined) {
      if (
        typeof body.default_symbol !== "string" ||
        body.default_symbol.trim().length === 0 ||
        body.default_symbol.length > 50
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid default symbol.",
          },
          { status: 400 }
        );
      }

      settings.default_symbol =
        body.default_symbol.trim().toUpperCase();
    }

    if (body.default_timeframe !== undefined) {
      if (
        !allowedTimeframes.includes(
          body.default_timeframe
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid timeframe.",
          },
          { status: 400 }
        );
      }

      settings.default_timeframe =
        body.default_timeframe;
    }

    if (body.trading_style !== undefined) {
      if (
        !allowedStyles.includes(body.trading_style)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid trading style.",
          },
          { status: 400 }
        );
      }

      settings.trading_style =
        body.trading_style;
    }

    if (body.risk_level !== undefined) {
      if (
        !allowedRiskLevels.includes(body.risk_level)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid risk level.",
          },
          { status: 400 }
        );
      }

      settings.risk_level = body.risk_level;
    }

    if (body.language !== undefined) {
      if (
        typeof body.language !== "string" ||
        body.language.length > 30
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid language.",
          },
          { status: 400 }
        );
      }

      settings.language = body.language;
    }

    if (
      body.notifications_enabled !== undefined
    ) {
      if (
        typeof body.notifications_enabled !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "notifications_enabled must be true or false.",
          },
          { status: 400 }
        );
      }

      settings.notifications_enabled =
        body.notifications_enabled;
    }

    const updatedSettings =
      await updateTraderSettings(settings);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully.",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Settings PUT error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update settings.",
      },
      { status: 500 }
    );
  }
}