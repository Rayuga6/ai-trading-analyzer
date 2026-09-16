import { NextRequest, NextResponse } from "next/server";
import {
  getAdminStats,
  getCurrentAdmin,
  getAdminConfigSummary,
  normalizeAdminPage,
  normalizeAdminPageSize,
  sanitizeAdminSearch,
  validateAdminResourceId,
} from "@/lib/admin";
import { securityResponseHeaders, sanitizeText } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: securityResponseHeaders(),
  });
}

function getAction(request: NextRequest): string {
  return (
    request.nextUrl.searchParams.get("action")?.trim() ||
    "stats"
  );
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
      );
    }

    const action = getAction(request);

    if (action === "stats") {
      const stats = await getAdminStats();

      return jsonResponse({
        success: true,
        admin,
        stats,
      });
    }

    if (action === "config") {
      return jsonResponse({
        success: true,
        admin,
        config: getAdminConfigSummary(),
      });
    }

    if (action === "query") {
      const page = normalizeAdminPage(
        request.nextUrl.searchParams.get("page"),
      );
      const pageSize = normalizeAdminPageSize(
        request.nextUrl.searchParams.get("pageSize"),
      );
      const search = sanitizeAdminSearch(
        request.nextUrl.searchParams.get("search"),
      );

      return jsonResponse({
        success: true,
        admin,
        query: {
          page,
          pageSize,
          search,
        },
        data: [],
        message:
          "Admin resource listing will be connected to the required tables as each admin module is enabled.",
      });
    }

    return jsonResponse(
      { error: "Unknown admin action." },
      400,
    );
  } catch (error) {
    console.error("Admin GET error:", sanitizeText(
      error instanceof Error ? error.message : "Unknown error",
      { maxLength: 300 },
    ));

    return jsonResponse(
      { error: "Unable to process admin request." },
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
      contentLength > 64 * 1024
    ) {
      return jsonResponse(
        { error: "Request body is too large." },
        413,
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body." },
        400,
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "";

    if (action === "validate-resource") {
      const resourceId =
        validateAdminResourceId(body.resourceId);

      return jsonResponse({
        success: true,
        resourceId,
      });
    }

    if (action === "config-check") {
      return jsonResponse({
        success: true,
        admin,
        config: getAdminConfigSummary(),
      });
    }

    if (action === "search") {
      const search = sanitizeAdminSearch(body.search);
      const page = normalizeAdminPage(body.page);
      const pageSize = normalizeAdminPageSize(
        body.pageSize,
      );

      return jsonResponse({
        success: true,
        query: {
          search,
          page,
          pageSize,
        },
        data: [],
        message:
          "Admin search endpoint is ready; domain-specific data sources will be connected by their respective modules.",
      });
    }

    return jsonResponse(
      { error: "Unknown admin action." },
      400,
    );
  } catch (error) {
    console.error("Admin POST error:", sanitizeText(
      error instanceof Error ? error.message : "Unknown error",
      { maxLength: 300 },
    ));

    const message =
      error instanceof Error &&
      error.message.startsWith("Invalid")
        ? error.message
        : "Unable to process admin request.";

    return jsonResponse(
      { error: message },
      message.startsWith("Invalid") ? 400 : 500,
    );
  }
}
