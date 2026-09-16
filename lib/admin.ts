import { createClient } from "@/lib/supabase/server";
import { sanitizeText, assertValidId } from "@/lib/security";

export type AdminRole = "admin" | "super_admin";

export interface AdminUser {
  id: string;
  email: string | null;
  role: AdminRole;
  isActive: boolean;
}

export interface AdminStats {
  users: number;
  activeSubscriptions: number;
  analyses: number;
  revenue: number;
}

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function normalizeRole(value: unknown): AdminRole {
  return value === "super_admin" ? "super_admin" : "admin";
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 320 ? email : null;
}

export function isConfiguredAdminEmail(
  email: string | null | undefined,
): boolean {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && ADMIN_EMAILS.has(normalized));
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const email = normalizeEmail(user.email);

  // Explicit allow-list is required for the admin area.
  if (!isConfiguredAdminEmail(email)) {
    return null;
  }

  const metadataRole =
    user.app_metadata?.role ??
    user.user_metadata?.role;

  const role = normalizeRole(metadataRole);

  return {
    id: user.id,
    email,
    role,
    isActive: true,
  };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Admin access required.");
  }

  return admin;
}

export function isSuperAdmin(admin: AdminUser): boolean {
  return admin.role === "super_admin";
}

export function sanitizeAdminSearch(
  value: unknown,
): string {
  return sanitizeText(
    typeof value === "string" ? value : "",
    { maxLength: 100 }
  ).trim();
}

export function normalizeAdminPage(
  value: unknown,
): number {
  const page =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(page)) return 1;

  return Math.max(1, Math.floor(page));
}

export function normalizeAdminPageSize(
  value: unknown,
): number {
  const size =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(size)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(size)),
  );
}

export function validateAdminResourceId(
  value: unknown,
): string {
  const id = assertValidId(value);

  if (!id) {
    throw new Error("Invalid resource id.");
  }

  return id;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const [
    usersResult,
    subscriptionsResult,
    analysesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
    supabase
      .from("analysis_history")
      .select("id", { count: "exact", head: true }),
  ]);

  if (usersResult.error) {
    throw new Error("Unable to load user statistics.");
  }

  if (subscriptionsResult.error) {
    throw new Error(
      "Unable to load subscription statistics.",
    );
  }

  if (analysesResult.error) {
    throw new Error(
      "Unable to load analysis statistics.",
    );
  }

  return {
    users: usersResult.count ?? 0,
    activeSubscriptions:
      subscriptionsResult.count ?? 0,
    analyses: analysesResult.count ?? 0,
    // Revenue should come from verified payment records,
    // once the payment ledger is connected.
    revenue: 0,
  };
}

export function getAdminConfigSummary() {
  return {
    adminAllowListConfigured: ADMIN_EMAILS.size > 0,
    adminEmailCount: ADMIN_EMAILS.size,
    maxPageSize: MAX_PAGE_SIZE,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  };
}
