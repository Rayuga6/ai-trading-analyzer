import { createHash, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeText,
  assertValidId,
} from "@/lib/security";

export type CouponDiscountType =
  | "percentage"
  | "fixed";

export type CouponStatus =
  | "active"
  | "disabled"
  | "expired";

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  status: CouponStatus;
  createdAt: string;
}

export interface CouponValidation {
  valid: boolean;
  code: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  reason?: string;
}

const MAX_CODE_LENGTH = 32;
const MAX_DISCOUNT_PERCENT = 100;
const MAX_FIXED_DISCOUNT = 1_000_000;

function normalizeCode(value: unknown): string {
  const code = sanitizeText(
    typeof value === "string" ? value : "",
    { maxLength: MAX_CODE_LENGTH },
  )
    .trim()
    .toUpperCase();

  if (
    !code ||
    !/^[A-Z0-9_-]{4,32}$/.test(code)
  ) {
    throw new Error("Invalid coupon code.");
  }

  return code;
}

function normalizeDiscountType(
  value: unknown,
): CouponDiscountType {
  if (
    value !== "percentage" &&
    value !== "fixed"
  ) {
    throw new Error(
      "Invalid coupon discount type.",
    );
  }

  return value;
}

function normalizeDiscountValue(
  value: unknown,
  type: CouponDiscountType,
): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      "Invalid coupon discount value.",
    );
  }

  if (
    type === "percentage" &&
    amount > MAX_DISCOUNT_PERCENT
  ) {
    throw new Error(
      "Coupon percentage cannot exceed 100.",
    );
  }

  if (
    type === "fixed" &&
    amount > MAX_FIXED_DISCOUNT
  ) {
    throw new Error(
      "Coupon fixed discount is too large.",
    );
  }

  return Math.round(amount * 100) / 100;
}

function mapCouponRow(
  row: Record<string, unknown>,
): Coupon {
  const discountType =
    row.discount_type === "fixed"
      ? "fixed"
      : "percentage";

  const status =
    row.status === "disabled" ||
    row.status === "expired"
      ? row.status
      : "active";

  return {
    id: String(row.id),
    code: normalizeCode(row.code),
    discountType,
    discountValue: Number(
      row.discount_value ?? 0,
    ),
    maxRedemptions:
      row.max_redemptions == null
        ? null
        : Number(row.max_redemptions),
    redemptionCount: Number(
      row.redemption_count ?? 0,
    ),
    startsAt:
      row.starts_at == null
        ? null
        : String(row.starts_at),
    expiresAt:
      row.expires_at == null
        ? null
        : String(row.expires_at),
    status,
    createdAt: String(
      row.created_at ??
        new Date().toISOString(),
    ),
  };
}

export function createCouponId(): string {
  return `coupon_${randomUUID()}`;
}

export function hashCouponCode(
  code: string,
): string {
  return createHash("sha256")
    .update(normalizeCode(code))
    .digest("hex");
}

export function isCouponCurrentlyActive(
  coupon: Coupon,
  now = new Date(),
): boolean {
  if (coupon.status !== "active") {
    return false;
  }

  if (
    coupon.startsAt &&
    new Date(coupon.startsAt) > now
  ) {
    return false;
  }

  if (
    coupon.expiresAt &&
    new Date(coupon.expiresAt) <= now
  ) {
    return false;
  }

  if (
    coupon.maxRedemptions !== null &&
    coupon.redemptionCount >=
      coupon.maxRedemptions
  ) {
    return false;
  }

  return true;
}

export function calculateCouponDiscount(
  coupon: Coupon,
  originalAmount: number,
): number {
  const amount = Number(originalAmount);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error("Invalid amount.");
  }

  if (
    coupon.discountType ===
    "percentage"
  ) {
    return Math.min(
      amount,
      Math.round(
        (amount *
          coupon.discountValue) /
          100 *
          100,
      ) / 100,
    );
  }

  return Math.min(
    amount,
    coupon.discountValue,
  );
}

export function validateCouponLocally(
  coupon: Coupon,
  originalAmount: number,
  now = new Date(),
): CouponValidation {
  const code = normalizeCode(
    coupon.code,
  );

  if (
    !isCouponCurrentlyActive(
      coupon,
      now,
    )
  ) {
    return {
      valid: false,
      code,
      reason:
        "Coupon is not currently active.",
    };
  }

  const discountAmount =
    calculateCouponDiscount(
      coupon,
      originalAmount,
    );

  const finalAmount =
    Math.max(
      0,
      Math.round(
        (originalAmount -
          discountAmount) *
          100,
      ) / 100,
    );

  return {
    valid: true,
    code,
    discountType:
      coupon.discountType,
    discountValue:
      coupon.discountValue,
    discountAmount,
    finalAmount,
  };
}

export async function getCouponByCode(
  code: string,
): Promise<Coupon | null> {
  const normalizedCode =
    normalizeCode(code);

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("coupons")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to load coupon.",
    );
  }

  return data
    ? mapCouponRow(data)
    : null;
}

export async function validateCoupon(
  code: string,
  originalAmount: number,
): Promise<CouponValidation> {
  const normalizedCode =
    normalizeCode(code);

  const coupon =
    await getCouponByCode(
      normalizedCode,
    );

  if (!coupon) {
    return {
      valid: false,
      code: normalizedCode,
      reason: "Coupon not found.",
    };
  }

  return validateCouponLocally(
    coupon,
    originalAmount,
  );
}

export async function createCoupon(input: {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
}): Promise<Coupon> {
  const code = normalizeCode(
    input.code,
  );

  const discountType =
    normalizeDiscountType(
      input.discountType,
    );

  const discountValue =
    normalizeDiscountValue(
      input.discountValue,
      discountType,
    );

  const maxRedemptions =
    input.maxRedemptions == null
      ? null
      : Math.max(
          1,
          Math.floor(
            Number(
              input.maxRedemptions,
            ),
          ),
        );

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("coupons")
      .insert({
        id: createCouponId(),
        code,
        code_hash:
          hashCouponCode(code),
        discount_type:
          discountType,
        discount_value:
          discountValue,
        max_redemptions:
          maxRedemptions,
        redemption_count: 0,
        starts_at:
          input.startsAt ?? null,
        expires_at:
          input.expiresAt ?? null,
        status: "active",
        created_at:
          new Date().toISOString(),
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      "Unable to create coupon.",
    );
  }

  return mapCouponRow(data);
}

export async function redeemCoupon(
  couponId: string,
  userId: string,
): Promise<boolean> {
  const normalizedCouponId = assertValidId(couponId);
  const normalizedUserId = assertValidId(userId);

  if (
    !normalizedCouponId ||
    !normalizedUserId
  ) {
    throw new Error(
      "Invalid coupon or user id.",
    );
  }

  const supabase =
    await createClient();

  const { error: redemptionError } =
    await supabase
      .from("coupon_redemptions")
      .insert({
        coupon_id:
          normalizedCouponId,
        user_id:
          normalizedUserId,
        created_at:
          new Date().toISOString(),
      });

  if (redemptionError) {
    throw new Error(
      "Coupon has already been redeemed or cannot be redeemed.",
    );
  }

  // Redemption count should be maintained by a database trigger
  // or an atomic database function when the coupon tables are added.
  // We intentionally do not write an undefined counter value here.
  return true;
}

export async function disableCoupon(
  couponId: string,
): Promise<boolean> {
  const id = assertValidId(couponId);

  if (!id) {
    throw new Error(
      "Invalid coupon id.",
    );
  }

  const supabase =
    await createClient();

  const { error } = await supabase
    .from("coupons")
    .update({
      status: "disabled",
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      "Unable to disable coupon.",
    );
  }

  return true;
}

export function getCouponConfig() {
  return {
    enabled:
      process.env.COUPONS_ENABLED !==
      "false",
    maxCodeLength:
      MAX_CODE_LENGTH,
    maxPercentageDiscount:
      MAX_DISCOUNT_PERCENT,
    maxFixedDiscount:
      MAX_FIXED_DISCOUNT,
  };
}
