import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  securityResponseHeaders,
  sanitizeText,
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 320;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 4_000;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: securityResponseHeaders(),
  });
}

function clean(value: unknown, maxLength: number) {
  return sanitizeText(
    typeof value === "string" ? value : "",
    { maxLength },
  ).trim();
}

function isValidEmail(email: string) {
  return (
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export async function POST(request: NextRequest) {
  try {
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

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body." },
        400,
      );
    }

    const name = clean(body.name, MAX_NAME_LENGTH);
    const email = clean(body.email, MAX_EMAIL_LENGTH);
    const subject = clean(
      body.subject,
      MAX_SUBJECT_LENGTH,
    );
    const message = clean(
      body.message,
      MAX_MESSAGE_LENGTH,
    );

    if (!name) {
      return jsonResponse(
        { error: "Name is required." },
        400,
      );
    }

    if (!email || !isValidEmail(email)) {
      return jsonResponse(
        { error: "A valid email is required." },
        400,
      );
    }

    if (!subject) {
      return jsonResponse(
        { error: "Subject is required." },
        400,
      );
    }

    if (!message) {
      return jsonResponse(
        { error: "Message is required." },
        400,
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Contact requests can be sent by guests. If logged in,
    // the authenticated user ID is attached server-side.
    const userId = user?.id ?? null;

    const { error } = await supabase
      .from("contact_messages")
      .insert({
        user_id: userId,
        name,
        email,
        subject,
        message,
        status: "open",
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error(
        "Contact insert error:",
        sanitizeText(error.message, { maxLength: 300 }),
      );

      return jsonResponse(
        {
          error:
            "Unable to send your message right now.",
        },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,
        message:
          "Your support request has been submitted.",
      },
      201,
    );
  } catch (error) {
    console.error(
      "Contact POST error:",
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
          "Unable to process your support request.",
      },
      500,
    );
  }
}

export async function GET() {
  return jsonResponse(
    {
      error:
        "Use POST to submit a support request.",
    },
    405,
  );
}
