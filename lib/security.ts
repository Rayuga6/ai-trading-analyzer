/**
 * Central server-side security helpers.
 *
 * Roadmap:
 * 57 Secure API Architecture
 * 58 API Abuse Protection
 * 60 Upload Security
 * 63 Error Handling
 * 65 Production Security Audit
 *
 * IMPORTANT:
 * - Do not import this file from client components.
 * - Never put secrets, API keys, service-role keys, or payment secrets here.
 * - Authentication/authorization is still required at each protected API route.
 */

export const SECURITY_LIMITS = {
  maxUploadBytes: 10 * 1024 * 1024,
  maxRequestBytes: 12 * 1024 * 1024,
  maxTextLength: 5000,
  maxSymbolLength: 40,
  maxMarketLength: 80,
  maxTimeframeLength: 10,
} as const;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export type SecurityErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class SecurityError extends Error {
  readonly code: SecurityErrorCode;
  readonly status: number;

  constructor(
    code: SecurityErrorCode,
    message: string,
    status: number
  ) {
    super(message);
    this.name = "SecurityError";
    this.code = code;
    this.status = status;
  }
}

export function sanitizeText(
  value: unknown,
  options: {
    fallback?: string;
    maxLength?: number;
    lowercase?: boolean;
    uppercase?: boolean;
  } = {}
) {
  const {
    fallback = "",
    maxLength = SECURITY_LIMITS.maxTextLength,
    lowercase = false,
    uppercase = false,
  } = options;

  let result = String(value ?? fallback)
    .replace(CONTROL_CHARS, "")
    .trim();

  if (lowercase) {
    result = result.toLowerCase();
  }

  if (uppercase) {
    result = result.toUpperCase();
  }

  return result.slice(0, Math.max(0, maxLength));
}

export function sanitizeSymbol(value: unknown) {
  return sanitizeText(value, {
    maxLength: SECURITY_LIMITS.maxSymbolLength,
    uppercase: true,
  }).replace(/[^A-Z0-9._/-]/g, "");
}

export function sanitizeMarket(value: unknown) {
  return sanitizeText(value, {
    maxLength: SECURITY_LIMITS.maxMarketLength,
  }).replace(/[^A-Za-z0-9 _&()./-]/g, "");
}

export function sanitizeTimeframe(value: unknown) {
  return sanitizeText(value, {
    maxLength: SECURITY_LIMITS.maxTimeframeLength,
    lowercase: true,
  }).replace(/[^a-z0-9]/g, "");
}

export function isAllowedImageType(mimeType: string) {
  return ALLOWED_IMAGE_TYPES.has(mimeType);
}

export function isValidUploadSize(size: number) {
  return (
    Number.isFinite(size) &&
    size > 0 &&
    size <= SECURITY_LIMITS.maxUploadBytes
  );
}

export function hasValidPngSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export function hasValidJpegSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

export function hasValidWebpSignature(bytes: Uint8Array) {
  if (bytes.length < 12) {
    return false;
  }

  const readAscii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  return readAscii(0, 4) === "RIFF" && readAscii(8, 12) === "WEBP";
}

export function hasValidImageSignature(
  bytes: Uint8Array,
  mimeType: string
) {
  switch (mimeType) {
    case "image/png":
      return hasValidPngSignature(bytes);

    case "image/jpeg":
      return hasValidJpegSignature(bytes);

    case "image/webp":
      return hasValidWebpSignature(bytes);

    default:
      return false;
  }
}

export function validateImageUpload(
  file: File,
  bytes?: Uint8Array
) {
  if (!(file instanceof File)) {
    throw new SecurityError(
      "BAD_REQUEST",
      "A valid image file is required.",
      400
    );
  }

  if (!isAllowedImageType(file.type)) {
    throw new SecurityError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Only PNG, JPEG, or WebP images are allowed.",
      415
    );
  }

  if (!isValidUploadSize(file.size)) {
    throw new SecurityError(
      "PAYLOAD_TOO_LARGE",
      "Image must be smaller than 10 MB.",
      413
    );
  }

  if (bytes && !hasValidImageSignature(bytes, file.type)) {
    throw new SecurityError(
      "UNSUPPORTED_MEDIA_TYPE",
      "The uploaded file is not a valid image.",
      415
    );
  }

  return true;
}

export function validateRequestContentLength(
  contentLengthHeader: string | null
) {
  if (!contentLengthHeader) {
    return true;
  }

  const contentLength = Number(contentLengthHeader);

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0
  ) {
    throw new SecurityError(
      "BAD_REQUEST",
      "Invalid request size.",
      400
    );
  }

  if (contentLength > SECURITY_LIMITS.maxRequestBytes) {
    throw new SecurityError(
      "PAYLOAD_TOO_LARGE",
      "Request is too large.",
      413
    );
  }

  return true;
}

export function assertValidId(value: unknown) {
  const id = sanitizeText(value, { maxLength: 100 });

  // UUIDs are accepted. Other internal IDs can be accepted if they are
  // short, non-control, URL-safe identifiers.
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const safeId = /^[A-Za-z0-9_-]{1,100}$/;

  if (!uuid.test(id) && !safeId.test(id)) {
    throw new SecurityError(
      "BAD_REQUEST",
      "Invalid identifier.",
      400
    );
  }

  return id;
}

export function assertFiniteNumber(
  value: unknown,
  fieldName = "value"
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new SecurityError(
      "BAD_REQUEST",
      `Invalid ${fieldName}.`,
      400
    );
  }

  return number;
}

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

export function getSafeErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  // Never expose raw database/API/provider errors to the browser.
  if (error instanceof SecurityError) {
    return error.message;
  }

  return fallback;
}

export function getSecurityErrorStatus(error: unknown) {
  if (error instanceof SecurityError) {
    return error.status;
  }

  return 500;
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

/**
 * Server-side secret checks.
 * This only checks presence; it never returns the secret value.
 */
export function assertServerEnvironment() {
  const missing: string[] = [];

  if (!process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missing.length > 0) {
    throw new SecurityError(
      "INTERNAL_ERROR",
      "Required server configuration is missing.",
      500
    );
  }

  return true;
}

export function securityResponseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=()",
  };
}

/**
 * Create a safe public error payload.
 * Internal stack traces, provider messages, SQL errors and secrets are never
 * returned to the client.
 */
export function publicErrorPayload(
  error: unknown,
  fallback = "Request failed. Please try again."
) {
  if (error instanceof SecurityError) {
    return {
      error: error.code,
      message: error.message,
    };
  }

  return {
    error: "INTERNAL_ERROR" as const,
    message: fallback,
  };
}

/**
 * Removes potentially dangerous response characters from user-controlled
 * strings before they are placed into logs.
 */
export function sanitizeLogValue(
  value: unknown,
  maxLength = 300
) {
  return sanitizeText(value, { maxLength })
    .replace(/[\r\n\t]/g, " ");
}

/**
 * A lightweight abuse heuristic for request-level values.
 * This is not a replacement for authentication or rate limiting.
 */
export function looksSuspiciousInput(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const text = value.toLowerCase();

  const suspiciousPatterns = [
    "<script",
    "javascript:",
    "data:text/html",
    "../",
    "..\\",
    "\u0000",
  ];

  return suspiciousPatterns.some((pattern) =>
    text.includes(pattern)
  );
}

export function assertSafeText(
  value: unknown,
  fieldName: string,
  maxLength = SECURITY_LIMITS.maxTextLength
) {
  if (looksSuspiciousInput(value)) {
    throw new SecurityError(
      "BAD_REQUEST",
      `Invalid ${fieldName}.`,
      400
    );
  }

  return sanitizeText(value, { maxLength });
}

/**
 * Basic production checklist helper.
 * It returns booleans only and never exposes secrets.
 */
export function getSecurityAudit() {
  const checks = {
    nodeEnvironment:
      process.env.NODE_ENV === "production",
    openAiKeyConfigured:
      Boolean(process.env.OPENAI_API_KEY),
    supabaseUrlConfigured:
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseKeyConfigured:
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  return {
    ...checks,
    passed: Object.values(checks).every(Boolean),
  };
}
