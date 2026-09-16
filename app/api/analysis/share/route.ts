import { NextRequest, NextResponse } from "next/server";
import {
  buildShareUrl,
  createAnalysisShare,
  getPublicAnalysisShare,
  revokeAnalysisShare,
} from "@/lib/analysis-share";
import { getAnalysisById } from "@/lib/database";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Request could not be completed.";
}

function isValidToken(token: string) {
  return (
    token.length >= 20 &&
    token.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim();

    if (token) {
      if (!isValidToken(token)) {
        return json(
          { success: false, error: "Invalid share token." },
          400,
        );
      }

      const share = await getPublicAnalysisShare(token);

      if (!share) {
        return json(
          { success: false, error: "Share not found or expired." },
          404,
        );
      }

      const analysis = await getAnalysisById(share.analysisId);

      if (!analysis) {
        return json(
          { success: false, error: "Shared analysis is unavailable." },
          404,
        );
      }

      return json({
        success: true,
        share: {
          id: share.id,
          analysisId: share.analysisId,
          expiresAt: share.expiresAt,
          createdAt: share.createdAt,
        },
        analysis,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json(
        { success: false, error: "Authentication required." },
        401,
      );
    }

    const analysisId =
      request.nextUrl.searchParams.get("analysisId")?.trim();

    const { getUserAnalysisShares } = await import(
      "@/lib/analysis-share"
    );

    const shares = await getUserAnalysisShares(analysisId);

    return json({
      success: true,
      shares,
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: errorMessage(error),
      },
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(
      request.headers.get("content-length") ?? "0",
    );

    if (contentLength > MAX_BODY_BYTES) {
      return json(
        { success: false, error: "Request body is too large." },
        413,
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json(
        { success: false, error: "Authentication required." },
        401,
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json(
        { success: false, error: "Invalid request body." },
        400,
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "create";

    if (action === "create") {
      const analysisId =
        typeof body.analysisId === "string"
          ? body.analysisId.trim()
          : "";

      if (!analysisId) {
        return json(
          { success: false, error: "Analysis ID is required." },
          400,
        );
      }

      const analysis = await getAnalysisById(analysisId);

      if (!analysis) {
        return json(
          { success: false, error: "Analysis not found." },
          404,
        );
      }

      const share = await createAnalysisShare({
        analysisId,
        expiresInDays:
          body.expiresInDays === null
            ? null
            : typeof body.expiresInDays === "number"
              ? body.expiresInDays
              : undefined,
      });

      const origin =
        request.headers.get("origin") ||
        request.nextUrl.origin;

      return json({
        success: true,
        share: {
          id: share.id,
          analysisId: share.analysisId,
          expiresAt: share.expiresAt,
          createdAt: share.createdAt,
          url: buildShareUrl(origin, share.token),
        },
      }, 201);
    }

    if (action === "revoke") {
      const shareId =
        typeof body.shareId === "string"
          ? body.shareId.trim()
          : "";

      if (!shareId) {
        return json(
          { success: false, error: "Share ID is required." },
          400,
        );
      }

      await revokeAnalysisShare(shareId);

      return json({
        success: true,
        message: "Analysis share revoked.",
      });
    }

    return json(
      { success: false, error: "Unsupported action." },
      400,
    );
  } catch (error) {
    const message = errorMessage(error);

    if (message === "Authentication required.") {
      return json(
        { success: false, error: message },
        401,
      );
    }

    if (
      message === "Invalid analysis ID." ||
      message === "Share expiry must be between 1 and 365 days." ||
      message === "Invalid share ID."
    ) {
      return json(
        { success: false, error: message },
        400,
      );
    }

    return json(
      {
        success: false,
        error: "Unable to process analysis share request.",
      },
      500,
    );
  }
}
