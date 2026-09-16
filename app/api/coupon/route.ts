import { NextRequest, NextResponse } from "next/server";
import {
  createCoupon,
  disableCoupon,
  getCouponConfig,
  getCouponByCode,
  validateCoupon,
  redeemCoupon,
  type CouponDiscountType,
} from "@/lib/coupon";
import { getCurrentAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
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
      request.nextUrl.searchParams.get(
        "code",
      );

    const amount = Number(
      request.nextUrl.searchParams.get(
        "amount",
      ) ?? "0",
    );

    if (code) {
      const result =
        await validateCoupon(
          code,
          amount,
        );

      return jsonResponse({
        success: true,
        result,
      });
    }

    return jsonResponse({
      success: true,
      config: getCouponConfig(),
    });
  } catch (error) {
    console.error(
      "Coupon GET error:",
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
          "Unable to process coupon request.",
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
      !getCouponConfig().enabled
    ) {
      return jsonResponse(
        {
          error:
            "Coupon program is currently disabled.",
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

    if (action === "validate") {
      const code =
        typeof body.code === "string"
          ? body.code
          : "";

      const amount = Number(
        body.amount ?? 0,
      );

      const result =
        await validateCoupon(
          code,
          amount,
        );

      return jsonResponse({
        success: true,
        result,
      });
    }

    if (action === "redeem") {
      const code =
        typeof body.code === "string"
          ? body.code
          : "";

      const coupon =
        await getCouponByCode(code);

      if (!coupon) {
        return jsonResponse(
          {
            error:
              "Coupon not found.",
          },
          404,
        );
      }

      const result =
        await validateCoupon(
          code,
          Number(body.amount ?? 0),
        );

      if (!result.valid) {
        return jsonResponse(
          {
            error:
              result.reason ||
              "Coupon is not valid.",
          },
          400,
        );
      }

      await redeemCoupon(
        coupon.id,
        userId,
      );

      return jsonResponse({
        success: true,
        result,
        message:
          "Coupon redeemed successfully.",
      });
    }

    if (action === "create") {
      const admin =
        await getCurrentAdmin();

      if (
        !admin ||
        admin.role !== "super_admin"
      ) {
        return jsonResponse(
          {
            error:
              "Super Admin access required.",
          },
          403,
        );
      }

      const discountType =
        body.discountType === "fixed"
          ? "fixed"
          : body.discountType ===
              "percentage"
            ? "percentage"
            : null;

      if (!discountType) {
        return jsonResponse(
          {
            error:
              "Invalid discount type.",
          },
          400,
        );
      }

      const coupon =
        await createCoupon({
          code:
            typeof body.code === "string"
              ? body.code
              : "",
          discountType:
            discountType as CouponDiscountType,
          discountValue: Number(
            body.discountValue ?? 0,
          ),
          maxRedemptions:
            body.maxRedemptions == null
              ? null
              : Number(
                  body.maxRedemptions,
                ),
          startsAt:
            typeof body.startsAt ===
            "string"
              ? body.startsAt
              : null,
          expiresAt:
            typeof body.expiresAt ===
            "string"
              ? body.expiresAt
              : null,
        });

      return jsonResponse(
        {
          success: true,
          coupon,
        },
        201,
      );
    }

    if (action === "disable") {
      const admin =
        await getCurrentAdmin();

      if (
        !admin ||
        admin.role !== "super_admin"
      ) {
        return jsonResponse(
          {
            error:
              "Super Admin access required.",
          },
          403,
        );
      }

      const couponId =
        typeof body.couponId ===
        "string"
          ? body.couponId
          : "";

      await disableCoupon(
        couponId,
      );

      return jsonResponse({
        success: true,
        message:
          "Coupon disabled.",
      });
    }

    return jsonResponse(
      {
        error:
          "Unknown coupon action.",
      },
      400,
    );
  } catch (error) {
    console.error(
      "Coupon POST error:",
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
          "cannot",
        ) ||
        error.message.includes(
          "required",
        )
      )
        ? error.message
        : "Unable to process coupon request.";

    return jsonResponse(
      { error: message },
      message.startsWith("Invalid") ||
        message.includes("cannot") ||
        message.includes("required")
        ? 400
        : 500,
    );
  }
}
