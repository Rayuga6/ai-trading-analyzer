import { NextRequest, NextResponse } from "next/server";
import {
  createDatabaseBackup,
  normalizeBackupScopes,
  serializeBackup,
  getBackupSummary,
} from "@/lib/backup";
import { getCurrentAdmin } from "@/lib/admin";
import { securityResponseHeaders, sanitizeText } from "@/lib/security";

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

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
      );
    }

    return jsonResponse({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      backup: {
        enabled: true,
        message:
          "Backup service is ready. Use POST to create a backup.",
      },
    });
  } catch (error) {
    console.error(
      "Admin backup GET error:",
      sanitizeText(
        error instanceof Error
          ? error.message
          : "Unknown error",
        { maxLength: 300 },
      ),
    );

    return jsonResponse(
      { error: "Unable to load backup status." },
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
      );
    }

    const contentLength = Number(
      request.headers.get("content-length") ?? "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BODY_BYTES
    ) {
      return jsonResponse(
        { error: "Request body is too large." },
        413,
      );
    }

    let body: Record<string, unknown> = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is valid and means all default scopes.
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "create";

    if (
      action !== "create" &&
      action !== "summary"
    ) {
      return jsonResponse(
        { error: "Unknown backup action." },
        400,
      );
    }

    const scopes = normalizeBackupScopes(
      body.scopes,
    );

    const backup = await createDatabaseBackup(
      scopes,
    );

    const summary = getBackupSummary(backup);

    if (action === "summary") {
      return jsonResponse({
        success: true,
        summary,
      });
    }

    return new NextResponse(
      serializeBackup(backup),
      {
        status: 200,
        headers: {
          ...securityResponseHeaders(),
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="aitrade-backup-${new Date()
              .toISOString()
              .replace(/[:.]/g, "-")}.json"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Admin backup POST error:",
      sanitizeText(
        error instanceof Error
          ? error.message
          : "Unknown error",
        { maxLength: 300 },
      ),
    );

    return jsonResponse(
      { error: "Unable to create backup." },
      500,
    );
  }
}
