import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

export interface AnalysisShare {
  id: string;
  userId: string;
  analysisId: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateAnalysisShareInput {
  analysisId: string;
  expiresInDays?: number | null;
}

export interface PublicAnalysisShare {
  id: string;
  analysisId: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Generates a random public token.
 * The raw token is returned to the caller; only its hash should be persisted.
 */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function normalizeShareExpiry(
  expiresInDays?: number | null,
): string | null {
  if (expiresInDays === null || expiresInDays === undefined) {
    return null;
  }

  if (
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 365
  ) {
    throw new Error("Share expiry must be between 1 and 365 days.");
  }

  const expiresAt = new Date();
  expiresAt.setUTCDate(
    expiresAt.getUTCDate() + expiresInDays,
  );

  return expiresAt.toISOString();
}

export function isShareExpired(
  expiresAt: string | null | undefined,
): boolean {
  if (!expiresAt) {
    return false;
  }

  const timestamp = Date.parse(expiresAt);

  if (Number.isNaN(timestamp)) {
    return true;
  }

  return timestamp <= Date.now();
}

export function validateAnalysisId(
  analysisId: string,
): string {
  const value = analysisId.trim();

  if (!value || value.length > 128) {
    throw new Error("Invalid analysis ID.");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error("Invalid analysis ID.");
  }

  return value;
}

/**
 * Creates a share record for an analysis.
 *
 * This helper is intentionally isolated from the database schema so the
 * share table can be enabled without changing the public share contract.
 */
export async function createAnalysisShare(
  input: CreateAnalysisShareInput,
): Promise<AnalysisShare> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const analysisId = validateAnalysisId(input.analysisId);
  const expiresAt = normalizeShareExpiry(
    input.expiresInDays,
  );

  const token = generateShareToken();
  const tokenHash = hashShareToken(token);

  /*
   * The analysis_shares table is part of the share feature's persistence
   * layer. Keep the insert isolated here so the API route does not need to
   * know database details.
   */
  const { data, error } = await supabase
    .from("analysis_shares")
    .insert({
      user_id: user.id,
      analysis_id: analysisId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select(
      "id, user_id, analysis_id, expires_at, created_at, revoked_at",
    )
    .single();

  if (error || !data) {
    throw new Error(
      "Unable to create analysis share.",
    );
  }

  return {
    id: data.id,
    userId: data.user_id,
    analysisId: data.analysis_id,
    token,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    revokedAt: data.revoked_at,
  };
}

export async function getUserAnalysisShares(
  analysisId?: string,
): Promise<AnalysisShare[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  let query = supabase
    .from("analysis_shares")
    .select(
      "id, user_id, analysis_id, expires_at, created_at, revoked_at",
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (analysisId) {
    query = query.eq(
      "analysis_id",
      validateAnalysisId(analysisId),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      "Unable to load analysis shares.",
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    analysisId: row.analysis_id,
    token: "",
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

export async function revokeAnalysisShare(
  shareId: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const id = shareId.trim();

  if (!id || id.length > 128) {
    throw new Error("Invalid share ID.");
  }

  const { error } = await supabase
    .from("analysis_shares")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) {
    throw new Error(
      "Unable to revoke analysis share.",
    );
  }
}

export async function getPublicAnalysisShare(
  token: string,
): Promise<PublicAnalysisShare | null> {
  const normalizedToken = token.trim();

  if (
    !normalizedToken ||
    normalizedToken.length < 20 ||
    normalizedToken.length > 128
  ) {
    return null;
  }

  const tokenHash = hashShareToken(normalizedToken);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analysis_shares")
    .select(
      "id, analysis_id, expires_at, created_at, revoked_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (
    data.revoked_at ||
    isShareExpired(data.expires_at)
  ) {
    return null;
  }

  return {
    id: data.id,
    analysisId: data.analysis_id,
    token: normalizedToken,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

export function buildShareUrl(
  origin: string,
  token: string,
): string {
  const safeOrigin = origin.replace(/\/+$/, "");
  const encodedToken = encodeURIComponent(token);

  return `${safeOrigin}/share/${encodedToken}`;
}
