import { createHash, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

export type BackupScope =
  | "profiles"
  | "trader_settings"
  | "analysis_history"
  | "favorites";

export interface BackupRecord {
  id: string;
  createdAt: string;
  scope: BackupScope[];
  rowCount: number;
  checksum: string;
  version: string;
  status: "completed" | "failed";
}

export interface BackupPayload {
  version: string;
  createdAt: string;
  tables: Partial<Record<BackupScope, unknown[]>>;
  rowCount: number;
  checksum: string;
}

const BACKUP_VERSION = "1.0";
const DEFAULT_SCOPES: BackupScope[] = [
  "profiles",
  "trader_settings",
  "analysis_history",
  "favorites",
];

const MAX_ROWS_PER_TABLE = 50_000;

function checksum(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function isScope(value: unknown): value is BackupScope {
  return (
    value === "profiles" ||
    value === "trader_settings" ||
    value === "analysis_history" ||
    value === "favorites"
  );
}

export function normalizeBackupScopes(
  scopes: unknown,
): BackupScope[] {
  if (!Array.isArray(scopes)) {
    return [...DEFAULT_SCOPES];
  }

  const unique = Array.from(
    new Set(scopes.filter(isScope)),
  );

  return unique.length ? unique : [...DEFAULT_SCOPES];
}

export function createBackupId(): string {
  return `backup_${randomUUID()}`;
}

export async function createDatabaseBackup(
  scopes: unknown = DEFAULT_SCOPES,
): Promise<BackupPayload> {
  const selectedScopes = normalizeBackupScopes(scopes);
  const supabase = await createClient();

  const tables: Partial<Record<BackupScope, unknown[]>> = {};
  let rowCount = 0;

  for (const scope of selectedScopes) {
    const { data, error } = await supabase
      .from(scope)
      .select("*")
      .limit(MAX_ROWS_PER_TABLE);

    if (error) {
      throw new Error(
        `Unable to back up ${scope}.`,
      );
    }

    const rows = data ?? [];
    tables[scope] = rows;
    rowCount += rows.length;
  }

  const createdAt = new Date().toISOString();

  const basePayload = {
    version: BACKUP_VERSION,
    createdAt,
    tables,
    rowCount,
  };

  return {
    ...basePayload,
    checksum: checksum(basePayload),
  };
}

export function verifyBackup(
  backup: unknown,
): backup is BackupPayload {
  if (
    !backup ||
    typeof backup !== "object"
  ) {
    return false;
  }

  const value = backup as Partial<BackupPayload>;

  if (
    typeof value.version !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.rowCount !== "number" ||
    typeof value.checksum !== "string" ||
    !value.tables ||
    typeof value.tables !== "object"
  ) {
    return false;
  }

  const basePayload = {
    version: value.version,
    createdAt: value.createdAt,
    tables: value.tables,
    rowCount: value.rowCount,
  };

  return checksum(basePayload) === value.checksum;
}

export function serializeBackup(
  backup: BackupPayload,
): string {
  if (!verifyBackup(backup)) {
    throw new Error("Invalid backup payload.");
  }

  return JSON.stringify(backup);
}

export function parseBackup(
  serialized: string,
): BackupPayload {
  if (
    typeof serialized !== "string" ||
    serialized.length > 50 * 1024 * 1024
  ) {
    throw new Error("Invalid or oversized backup.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Backup is not valid JSON.");
  }

  if (!verifyBackup(parsed)) {
    throw new Error("Backup checksum or structure is invalid.");
  }

  return parsed;
}

export function getBackupSummary(
  backup: BackupPayload,
): BackupRecord {
  if (!verifyBackup(backup)) {
    throw new Error("Invalid backup payload.");
  }

  return {
    id: createBackupId(),
    createdAt: backup.createdAt,
    scope: normalizeBackupScopes(
      Object.keys(backup.tables),
    ),
    rowCount: backup.rowCount,
    checksum: backup.checksum,
    version: backup.version,
    status: "completed",
  };
}

export function getBackupLimits() {
  return {
    maxRowsPerTable: MAX_ROWS_PER_TABLE,
    maxSerializedSizeBytes: 50 * 1024 * 1024,
    version: BACKUP_VERSION,
  };
}
