import { createClient } from "@/lib/supabase/server";

export type FeedbackType =
  | "accuracy"
  | "quality"
  | "bug"
  | "suggestion"
  | "other";

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface AnalysisFeedback {
  id: string;
  userId: string;
  analysisId: string | null;
  rating: FeedbackRating;
  type: FeedbackType;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  analysisId?: string | null;
  rating: FeedbackRating;
  type?: FeedbackType;
  comment?: string | null;
}

const MAX_COMMENT_LENGTH = 2000;
const VALID_TYPES: FeedbackType[] = [
  "accuracy",
  "quality",
  "bug",
  "suggestion",
  "other",
];

function isRating(value: unknown): value is FeedbackRating {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5
  );
}

export function validateFeedbackInput(
  input: CreateFeedbackInput,
): CreateFeedbackInput {
  if (!isRating(input.rating)) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const type = input.type ?? "quality";

  if (!VALID_TYPES.includes(type)) {
    throw new Error("Invalid feedback type.");
  }

  let analysisId = input.analysisId ?? null;

  if (analysisId !== null) {
    analysisId = analysisId.trim();

    if (
      !analysisId ||
      analysisId.length > 128 ||
      !/^[a-zA-Z0-9_-]+$/.test(analysisId)
    ) {
      throw new Error("Invalid analysis ID.");
    }
  }

  let comment = input.comment ?? null;

  if (comment !== null) {
    comment = comment.trim();

    if (comment.length > MAX_COMMENT_LENGTH) {
      throw new Error(
        `Feedback comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`,
      );
    }

    if (!comment) {
      comment = null;
    }
  }

  return {
    analysisId,
    rating: input.rating,
    type,
    comment,
  };
}

function mapFeedback(row: Record<string, unknown>): AnalysisFeedback {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    analysisId:
      typeof row.analysis_id === "string"
        ? row.analysis_id
        : null,
    rating: Number(row.rating) as FeedbackRating,
    type: row.type as FeedbackType,
    comment:
      typeof row.comment === "string"
        ? row.comment
        : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createFeedback(
  input: CreateFeedbackInput,
): Promise<AnalysisFeedback> {
  const validated = validateFeedbackInput(input);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { data, error } = await supabase
    .from("analysis_feedback")
    .insert({
      user_id: user.id,
      analysis_id: validated.analysisId,
      rating: validated.rating,
      type: validated.type,
      comment: validated.comment,
    })
    .select(
      "id, user_id, analysis_id, rating, type, comment, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error("Unable to save feedback.");
  }

  return mapFeedback(data);
}

export async function getUserFeedback(
  analysisId?: string | null,
): Promise<AnalysisFeedback[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  let query = supabase
    .from("analysis_feedback")
    .select(
      "id, user_id, analysis_id, rating, type, comment, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (analysisId) {
    const validatedAnalysisId = validateFeedbackInput({
      analysisId,
      rating: 5,
    }).analysisId;

    query = query.eq(
      "analysis_id",
      validatedAnalysisId,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Unable to load feedback.");
  }

  return (data ?? []).map((row) =>
    mapFeedback(row),
  );
}

export async function updateFeedback(
  feedbackId: string,
  input: CreateFeedbackInput,
): Promise<AnalysisFeedback> {
  const id = feedbackId.trim();

  if (
    !id ||
    id.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(id)
  ) {
    throw new Error("Invalid feedback ID.");
  }

  const validated = validateFeedbackInput(input);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { data, error } = await supabase
    .from("analysis_feedback")
    .update({
      rating: validated.rating,
      type: validated.type,
      comment: validated.comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, user_id, analysis_id, rating, type, comment, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error("Unable to update feedback.");
  }

  return mapFeedback(data);
}

export async function deleteFeedback(
  feedbackId: string,
): Promise<void> {
  const id = feedbackId.trim();

  if (
    !id ||
    id.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(id)
  ) {
    throw new Error("Invalid feedback ID.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { error } = await supabase
    .from("analysis_feedback")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Unable to delete feedback.");
  }
}

export function getFeedbackLabel(
  type: FeedbackType,
): string {
  switch (type) {
    case "accuracy":
      return "Signal accuracy";
    case "quality":
      return "Analysis quality";
    case "bug":
      return "Bug report";
    case "suggestion":
      return "Suggestion";
    default:
      return "Other";
  }
}

export function getRatingLabel(
  rating: FeedbackRating,
): string {
  switch (rating) {
    case 1:
      return "Very poor";
    case 2:
      return "Poor";
    case 3:
      return "Average";
    case 4:
      return "Good";
    case 5:
      return "Excellent";
  }
}
