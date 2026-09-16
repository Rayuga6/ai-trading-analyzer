import { NextResponse } from "next/server";
import {
  getPublicFeatureFlags,
  getFeatureFlagConfig,
} from "@/lib/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSecurityHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

export async function GET() {
  try {
    const flags = getPublicFeatureFlags();
    const featureConfig = getFeatureFlagConfig();

    return NextResponse.json(
      {
        success: true,
        config: {
          version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
          environment:
            process.env.NODE_ENV === "production"
              ? "production"
              : "development",
          currency: "INR",
          languages: ["en", "hi", "gu"],
          features: flags,
          featureConfig,
          featureCount: Object.keys(flags).length,
        },
      },
      {
        status: 200,
        headers: getSecurityHeaders(),
      }
    );
  } catch (error) {
    console.error("Public config error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load application configuration.",
      },
      {
        status: 500,
        headers: {
          ...getSecurityHeaders(),
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
