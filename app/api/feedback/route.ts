import { NextRequest, NextResponse } from "next/server";
import {
  createFeedback,
  deleteFeedback,
  getUserFeedback,
  updateFeedback,
  type FeedbackType,
  type FeedbackRating,
} from "@/lib/feedback";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request could not be completed.";
}

function isRating(value: unknown): value is FeedbackRating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return value === "accuracy" || value === "quality" || value === "bug" ||
    value === "suggestion" || value === "other";
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return user;
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const analysisId = request.nextUrl.searchParams.get("analysisId");
    const feedback = await getUserFeedback(analysisId?.trim() || null);
    return json({ success: true, feedback });
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Authentication required.") return json({ success: false, error: msg }, 401);
    if (msg === "Invalid analysis ID.") return json({ success: false, error: msg }, 400);
    return json({ success: false, error: "Unable to load feedback." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY_BYTES) {
      return json({ success: false, error: "Request body is too large." }, 413);
    }

    await requireUser();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ success: false, error: "Invalid request body." }, 400);
    }

    const action = typeof body.action === "string" ? body.action.trim() : "create";

    if (action === "create" || action === "update") {
      if (!isRating(body.rating)) {
        return json({ success: false, error: "Rating must be between 1 and 5." }, 400);
      }
      if (body.type !== undefined && !isFeedbackType(body.type)) {
        return json({ success: false, error: "Invalid feedback type." }, 400);
      }

      const input = {
        analysisId: typeof body.analysisId === "string" ? body.analysisId : null,
        rating: body.rating,
        type: body.type,
        comment: typeof body.comment === "string" ? body.comment : null,
      };

      if (action === "create") {
        const feedback = await createFeedback(input);
        return json({ success: true, feedback }, 201);
      }

      const feedbackId = typeof body.feedbackId === "string" ? body.feedbackId.trim() : "";
      if (!feedbackId) {
        return json({ success: false, error: "Feedback ID is required." }, 400);
      }

      const feedback = await updateFeedback(feedbackId, input);
      return json({ success: true, feedback });
    }

    if (action === "delete") {
      const feedbackId = typeof body.feedbackId === "string" ? body.feedbackId.trim() : "";
      if (!feedbackId) {
        return json({ success: false, error: "Feedback ID is required." }, 400);
      }
      await deleteFeedback(feedbackId);
      return json({ success: true, message: "Feedback deleted." });
    }

    return json({ success: false, error: "Unsupported action." }, 400);
  } catch (error) {
    const msg = errorMessage(error);
    if (msg === "Authentication required.") return json({ success: false, error: msg }, 401);

    const clientErrors = [
      "Rating must be between 1 and 5.",
      "Invalid feedback type.",
      "Invalid analysis ID.",
      "Invalid feedback ID.",
      "Feedback ID is required.",
      "Feedback comment cannot exceed 2000 characters.",
    ];

    if (clientErrors.includes(msg)) {
      return json({ success: false, error: msg }, 400);
    }

    return json({ success: false, error: "Unable to process feedback." }, 500);
  }
}
