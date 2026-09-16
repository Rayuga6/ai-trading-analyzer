import { createHash, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { assertValidId, sanitizeText } from "@/lib/security";

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string | null;
  code: string;
  status: "pending" | "completed" | "cancelled";
  rewardAmount: number;
  rewardCurrency: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ReferralStats {
  code: string;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  rewards: number;
  currency: string;
}

const CODE_LENGTH = 10;
const MAX_REWARD = 100_000;

function normalizeUserId(value: unknown): string {
  return assertValidId(value);
}

function normalizeCode(value: unknown): string {
  const code = sanitizeText(
    typeof value === "string" ? value : "",
    { maxLength: 32 },
  )
    .trim()
    .toUpperCase();

  if (
    !code ||
    !/^[A-Z0-9_-]{4,32}$/.test(code)
  ) {
    throw new Error("Invalid referral code.");
  }

  return code;
}

function normalizeReward(value: unknown): number {
  const reward = Number(value ?? 0);

  if (
    !Number.isFinite(reward) ||
    reward < 0 ||
    reward > MAX_REWARD
  ) {
    throw new Error("Invalid referral reward.");
  }

  return Math.round(reward * 100) / 100;
}

function mapReferralRow(
  row: Record<string, unknown>,
): Referral {
  const status =
    row.status === "completed" ||
    row.status === "cancelled"
      ? row.status
      : "pending";

  return {
    id: String(row.id),
    referrerId: String(row.referrer_id),
    referredUserId:
      row.referred_user_id == null
        ? null
        : String(row.referred_user_id),
    code: String(row.code ?? ""),
    status,
    rewardAmount: Number(row.reward_amount ?? 0),
    rewardCurrency: String(
      row.reward_currency ?? "INR",
    ),
    createdAt: String(
      row.created_at ?? new Date().toISOString(),
    ),
    completedAt:
      row.completed_at == null
        ? null
        : String(row.completed_at),
  };
}

export function generateReferralCode(
  userId: string,
): string {
  const normalizedUserId =
    normalizeUserId(userId);

  const hash = createHash("sha256")
    .update(
      `${normalizedUserId}:${process.env.REFERRAL_CODE_SALT ?? "default"}`,
    )
    .digest("hex")
    .toUpperCase();

  return `AIT${hash.slice(0, CODE_LENGTH)}`;
}

export function createReferralId(): string {
  return `ref_${randomUUID()}`;
}

export function buildReferralLink(
  code: string,
  origin?: string,
): string {
  const normalizedCode = normalizeCode(code);
  const base =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return `${base.replace(/\/+$/, "")}/signup?ref=${encodeURIComponent(normalizedCode)}`;
}

export async function getOrCreateReferralCode(
  userId: string,
): Promise<string> {
  const normalizedUserId =
    normalizeUserId(userId);

  const supabase =
    await createClient();

  const { data, error } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to load referral code.",
    );
  }

  if (data?.code) {
    return normalizeCode(data.code);
  }

  const code =
    generateReferralCode(normalizedUserId);

  const { error: insertError } =
    await supabase
      .from("referral_codes")
      .insert({
        user_id: normalizedUserId,
        code,
        created_at:
          new Date().toISOString(),
      });

  if (insertError) {
    // A concurrent request may have created it.
    const { data: existing } =
      await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", normalizedUserId)
        .maybeSingle();

    if (existing?.code) {
      return normalizeCode(existing.code);
    }

    throw new Error(
      "Unable to create referral code.",
    );
  }

  return code;
}

export async function createReferral(
  referrerId: string,
  code: string,
  referredUserId?: string | null,
): Promise<Referral> {
  const normalizedReferrerId =
    normalizeUserId(referrerId);
  const normalizedCode =
    normalizeCode(code);

  const normalizedReferredId =
    referredUserId
      ? normalizeUserId(referredUserId)
      : null;

  if (
    normalizedReferredId &&
    normalizedReferredId === normalizedReferrerId
  ) {
    throw new Error(
      "A user cannot refer themselves.",
    );
  }

  const supabase =
    await createClient();

  const { data, error } = await supabase
    .from("referrals")
    .insert({
      id: createReferralId(),
      referrer_id: normalizedReferrerId,
      referred_user_id:
        normalizedReferredId,
      code: normalizedCode,
      status: "pending",
      reward_amount: 0,
      reward_currency: "INR",
      created_at:
        new Date().toISOString(),
      completed_at: null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      "Unable to create referral.",
    );
  }

  return mapReferralRow(data);
}

export async function completeReferral(
  referralId: string,
  rewardAmount: number,
): Promise<Referral> {
  const id = assertValidId(referralId);

  const reward =
    normalizeReward(rewardAmount);

  const supabase =
    await createClient();

  const { data, error } = await supabase
    .from("referrals")
    .update({
      status: "completed",
      reward_amount: reward,
      completed_at:
        new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) {
    throw new Error(
      "Unable to complete referral.",
    );
  }

  return mapReferralRow(data);
}

export async function cancelReferral(
  referralId: string,
): Promise<boolean> {
  const id = assertValidId(referralId);

  const supabase =
    await createClient();

  const { error } = await supabase
    .from("referrals")
    .update({
      status: "cancelled",
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(
      "Unable to cancel referral.",
    );
  }

  return true;
}

export async function getUserReferrals(
  userId: string,
  limit = 50,
): Promise<Referral[]> {
  const normalizedUserId =
    normalizeUserId(userId);

  const safeLimit = Math.min(
    100,
    Math.max(
      1,
      Math.floor(Number(limit) || 50),
    ),
  );

  const supabase =
    await createClient();

  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", normalizedUserId)
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (error) {
    throw new Error(
      "Unable to load referrals.",
    );
  }

  return (data ?? []).map(
    mapReferralRow,
  );
}

export function summarizeReferrals(
  referrals: Referral[],
): ReferralStats {
  const code =
    referrals[0]?.code ?? "";

  let completed = 0;
  let pending = 0;
  let cancelled = 0;
  let rewards = 0;

  for (const referral of referrals) {
    if (referral.status === "completed") {
      completed += 1;
      rewards += referral.rewardAmount;
    } else if (
      referral.status === "cancelled"
    ) {
      cancelled += 1;
    } else {
      pending += 1;
    }
  }

  return {
    code,
    total: referrals.length,
    completed,
    pending,
    cancelled,
    rewards:
      Math.round(rewards * 100) / 100,
    currency:
      referrals[0]?.rewardCurrency ??
      "INR",
  };
}

export function getReferralConfig() {
  return {
    enabled:
      process.env.REFERRAL_ENABLED !==
      "false",
    defaultRewardCurrency: "INR",
    maxReward: MAX_REWARD,
  };
}
