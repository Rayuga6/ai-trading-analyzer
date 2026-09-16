import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText, assertValidId } from "@/lib/security";

export type NotificationType =
  | "system"
  | "analysis"
  | "price_alert"
  | "subscription"
  | "payment"
  | "security"
  | "marketing";

export type NotificationChannel =
  | "in_app"
  | "email"
  | "push";

export type NotificationPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  title: string;
  message: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

const MAX_TITLE_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_NOTIFICATIONS_PER_REQUEST = 50;

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

function normalizeUserId(value: unknown): string {
  return assertValidId(value);
}

function normalizeTitle(value: unknown): string {
  const title = sanitizeText(
    typeof value === "string" ? value : "",
    { maxLength: MAX_TITLE_LENGTH },
  ).trim();

  if (!title) {
    throw new Error("Notification title is required.");
  }

  return title;
}

function normalizeMessage(value: unknown): string {
  const message = sanitizeText(
    typeof value === "string" ? value : "",
    { maxLength: MAX_MESSAGE_LENGTH },
  ).trim();

  if (!message) {
    throw new Error("Notification message is required.");
  }

  return message;
}

export function validateNotificationInput(
  input: CreateNotificationInput,
): CreateNotificationInput {
  const userId = normalizeUserId(input.userId);

  if (!validType(input.type)) {
    throw new Error("Invalid notification type.");
  }

  const channel =
    input.channel === undefined
      ? "in_app"
      : input.channel;

  if (!validChannel(channel)) {
    throw new Error("Invalid notification channel.");
  }

  const priority =
    input.priority === undefined
      ? "normal"
      : input.priority;

  if (!validPriority(priority)) {
    throw new Error("Invalid notification priority.");
  }

  return {
    userId,
    type: input.type,
    channel,
    priority,
    title: normalizeTitle(input.title),
    message: normalizeMessage(input.message),
    expiresAt: input.expiresAt ?? null,
    metadata:
      input.metadata &&
      typeof input.metadata === "object"
        ? input.metadata
        : {},
  };
}

export function buildNotification(
  input: CreateNotificationInput,
): Notification {
  const normalized =
    validateNotificationInput(input);

  return {
    id: randomUUID(),
    userId: normalized.userId,
    type: normalized.type,
    channel: normalized.channel ?? "in_app",
    priority: normalized.priority ?? "normal",
    title: normalized.title,
    message: normalized.message,
    read: false,
    createdAt: new Date().toISOString(),
    expiresAt: normalized.expiresAt,
    metadata: normalized.metadata,
  };
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const notification = buildNotification(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      id: notification.id,
      user_id: notification.userId,
      type: notification.type,
      channel: notification.channel,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      created_at: notification.createdAt,
      expires_at: notification.expiresAt,
      metadata: notification.metadata,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error("Unable to create notification.");
  }

  return mapNotificationRow(data);
}

export async function createNotifications(
  inputs: CreateNotificationInput[],
): Promise<Notification[]> {
  if (
    !Array.isArray(inputs) ||
    inputs.length === 0
  ) {
    return [];
  }

  if (
    inputs.length >
    MAX_NOTIFICATIONS_PER_REQUEST
  ) {
    throw new Error(
      "Too many notifications in one request.",
    );
  }

  const notifications = inputs.map(buildNotification);
  const supabase = await createClient();

  const rows = notifications.map((notification) => ({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    channel: notification.channel,
    priority: notification.priority,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    created_at: notification.createdAt,
    expires_at: notification.expiresAt,
    metadata: notification.metadata,
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error("Unable to create notifications.");
  }

  return (data ?? []).map(mapNotificationRow);
}

function mapNotificationRow(
  row: Record<string, unknown>,
): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: validType(row.type)
      ? row.type
      : "system",
    channel: validChannel(row.channel)
      ? row.channel
      : "in_app",
    priority: validPriority(row.priority)
      ? row.priority
      : "normal",
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    read: Boolean(row.read),
    createdAt: String(
      row.created_at ?? new Date().toISOString(),
    ),
    expiresAt:
      row.expires_at === null ||
      row.expires_at === undefined
        ? null
        : String(row.expires_at),
    metadata:
      row.metadata &&
      typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

export async function getUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    type?: NotificationType;
    limit?: number;
  },
): Promise<Notification[]> {
  const normalizedUserId =
    normalizeUserId(userId);

  const limit = Math.min(
    100,
    Math.max(
      1,
      Math.floor(
        Number(options?.limit ?? 50),
      ),
    ),
  );

  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", normalizedUserId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (options?.unreadOnly) {
    query = query.eq("read", false);
  }

  if (options?.type && validType(options.type)) {
    query = query.eq("type", options.type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Unable to load notifications.");
  }

  return (data ?? []).map(mapNotificationRow);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const normalizedUserId =
    normalizeUserId(userId);
  const normalizedNotificationId =
    assertValidId(notificationId);

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", normalizedNotificationId)
    .eq("user_id", normalizedUserId);

  if (error) {
    throw new Error(
      "Unable to update notification.",
    );
  }

  return true;
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const normalizedUserId =
    normalizeUserId(userId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", normalizedUserId)
    .eq("read", false)
    .select("id");

  if (error) {
    throw new Error(
      "Unable to update notifications.",
    );
  }

  return data?.length ?? 0;
}

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const normalizedUserId =
    normalizeUserId(userId);
  const normalizedNotificationId =
    assertValidId(notificationId);

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", normalizedNotificationId)
    .eq("user_id", normalizedUserId);

  if (error) {
    throw new Error(
      "Unable to delete notification.",
    );
  }

  return true;
}

export function getNotificationSummary(
  notifications: Notification[],
) {
  let unread = 0;
  let critical = 0;
  let high = 0;

  for (const notification of notifications) {
    if (!notification.read) unread += 1;
    if (notification.priority === "critical") {
      critical += 1;
    }
    if (notification.priority === "high") {
      high += 1;
    }
  }

  return {
    total: notifications.length,
    unread,
    critical,
    high,
  };
}
