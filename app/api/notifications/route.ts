import { NextRequest, NextResponse } from "next/server";
import {
  createNotification,
  getNotificationSummary,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  validateNotificationInput,
  type CreateNotificationInput,
  type NotificationType,
  type NotificationChannel,
  type NotificationPriority,
} from "@/lib/notifications";
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

async function getAuthenticatedUserId() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function validType(
  value: unknown,
): value is NotificationType {
  return (
    value === "system" ||
    value === "analysis" ||
    value === "price_alert" ||
    value === "subscription" ||
    value === "payment" ||
    value === "security" ||
    value === "marketing"
  );
}

function validChannel(
  value: unknown,
): value is NotificationChannel {
  return (
    value === "in_app" ||
    value === "email" ||
    value === "push"
  );
}

function validPriority(
  value: unknown,
): value is NotificationPriority {
  return (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "critical"
  );
}

export async function GET(request: NextRequest) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
      );
    }

    const params = request.nextUrl.searchParams;

    const unreadOnly =
      params.get("unreadOnly") === "true";

    const typeValue = params.get("type");
    const type = validType(typeValue)
      ? typeValue
      : undefined;

    const requestedLimit = Number(
      params.get("limit") ?? "50",
    );

    const limit = Number.isFinite(
      requestedLimit,
    )
      ? Math.min(
          100,
          Math.max(
            1,
            Math.floor(requestedLimit),
          ),
        )
      : 50;

    const notifications =
      await getUserNotifications(userId, {
        unreadOnly,
        type,
        limit,
      });

    return jsonResponse({
      success: true,
      notifications,
      summary:
        getNotificationSummary(
          notifications,
        ),
    });
  } catch (error) {
    console.error(
      "Notifications GET error:",
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
          "Unable to load notifications.",
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return jsonResponse(
        { error: "Unauthorized." },
        401,
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
          error: "Invalid JSON body.",
        },
        400,
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "";

    if (action === "mark-read") {
      const notificationId =
        typeof body.notificationId ===
        "string"
          ? body.notificationId
          : "";

      await markNotificationRead(
        userId,
        notificationId,
      );

      return jsonResponse({
        success: true,
        message:
          "Notification marked as read.",
      });
    }

    if (action === "mark-all-read") {
      const count =
        await markAllNotificationsRead(
          userId,
        );

      return jsonResponse({
        success: true,
        updated: count,
      });
    }

    if (action === "delete") {
      const notificationId =
        typeof body.notificationId ===
        "string"
          ? body.notificationId
          : "";

      await deleteNotification(
        userId,
        notificationId,
      );

      return jsonResponse({
        success: true,
        message:
          "Notification deleted.",
      });
    }

    if (action === "create") {
      const input: CreateNotificationInput =
        {
          userId,
          type: validType(body.type)
            ? body.type
            : "system",
          channel:
            validChannel(body.channel)
              ? body.channel
              : "in_app",
          priority:
            validPriority(body.priority)
              ? body.priority
              : "normal",
          title:
            typeof body.title ===
            "string"
              ? body.title
              : "",
          message:
            typeof body.message ===
            "string"
              ? body.message
              : "",
          expiresAt:
            typeof body.expiresAt ===
            "string"
              ? body.expiresAt
              : null,
          metadata:
            body.metadata &&
            typeof body.metadata ===
              "object"
              ? (body.metadata as Record<
                  string,
                  unknown
                >)
              : {},
        };

      const validated =
        validateNotificationInput(
          input,
        );

      const notification =
        await createNotification(
          validated,
        );

      return jsonResponse(
        {
          success: true,
          notification,
        },
        201,
      );
    }

    return jsonResponse(
      {
        error:
          "Unknown notification action.",
      },
      400,
    );
  } catch (error) {
    console.error(
      "Notifications POST error:",
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
          "required",
        ) ||
        error.message.includes(
          "notification",
        )
      )
        ? error.message
        : "Unable to process notification request.";

    return jsonResponse(
      { error: message },
      400,
    );
  }
}
