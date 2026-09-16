import { NextRequest, NextResponse } from "next/server";
import {
  buildReferralLink,
  cancelReferral,
  completeReferral,
  createReferral,
  getOrCreateReferralCode,
  getReferralConfig,
  getUserReferrals,
  summarizeReferrals,
} from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";
import {
  securityResponseHeaders,
  sanitizeText,
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: securityResponseHeaders(),
  });
}

async function getUserId() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
      );
    }

    const code =
      await getOrCreateReferralCode(
        userId,
      );

    const origin =
      request.nextUrl.origin;

    const referrals =
      await getUserReferrals(userId);

    return jsonResponse({
      success: true,
      enabled:
        getReferralConfig().enabled,
      code,
      link: buildReferralLink(
        code,
        origin,
      ),
      referrals,
      summary:
        summarizeReferrals(referrals),
    });
  } catch (error) {
    console.error(
      "Referral GET error:",
      sanitizeText(
        error instanceof Error
          ? error.message
          : "Unknown error",
        { maxLength: 300 },
      ),
    );

    return jsonResponse(
      {
        error:
          "Unable to load referral information.",
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
      );
    }

    if (
      !getReferralConfig().enabled
    ) {
      return jsonResponse(
        {
          error:
            "Referral program is currently disabled.",
        },
        403,
      );
    }

    const contentLength = Number(
      request.headers.get(
        "content-length",
      ) ?? "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BODY_BYTES
    ) {
      return jsonResponse(
        {
          error:
            "Request body is too large.",
        },
        413,
      );
    }

    let body: Record<
      string,
      unknown
    >;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON body.",
        },
        400,
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "";

    if (action === "create") {
      const code =
        await getOrCreateReferralCode(
          userId,
        );

      const referral =
        await createReferral(
          userId,
          code,
          typeof body.referredUserId ===
            "string"
            ? body.referredUserId
            : null,
        );

      return jsonResponse(
        {
          success: true,
          referral,
        },
        201,
      );
    }

    if (action === "complete") {
      const referralId =
        typeof body.referralId ===
        "string"
          ? body.referralId
          : "";

      const rewardAmount = Number(
        body.rewardAmount ?? 0,
      );

      const referral =
        await completeReferral(
          referralId,
          rewardAmount,
        );

      return jsonResponse({
        success: true,
        referral,
      });
    }

    if (action === "cancel") {
      const referralId =
        typeof body.referralId ===
        "string"
          ? body.referralId
          : "";

      await cancelReferral(
        referralId,
      );

      return jsonResponse({
        success: true,
        message:
          "Referral cancelled.",
      });
    }

    if (action === "link") {
      const code =
        await getOrCreateReferralCode(
          userId,
        );

      return jsonResponse({
        success: true,
        code,
        link: buildReferralLink(
          code,
          request.nextUrl.origin,
        ),
      });
    }

    return jsonResponse(
      {
        error:
          "Unknown referral action.",
      },
      400,
    );
  } catch (error) {
    console.error(
      "Referral POST error:",
      sanitizeText(
        error instanceof Error
          ? error.message
          : "Unknown error",
        { maxLength: 300 },
      ),
    );

    const message =
      error instanceof Error &&
      (
        error.message.startsWith(
          "Invalid",
        ) ||
        error.message.includes(
          "cannot refer",
        )
      )
        ? error.message
        : "Unable to process referral request.";

    return jsonResponse(
      { error: message },
      message.startsWith("Invalid") ||
        message.includes("cannot refer")
        ? 400
        : 500,
    );
  }
}
